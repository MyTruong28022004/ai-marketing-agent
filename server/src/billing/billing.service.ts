import { ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common'
import {
  BillingOrderStatus,
  BillingOrderType,
  Prisma,
  ServicePlan,
  SubscriptionStatus,
  TokenTransactionType,
} from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { PrismaService } from '../prisma/prisma.service'
import { PLAN_CATALOG, TOKEN_ADD_ONS } from './billing.constants'

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  catalog() {
    return { plans: Object.values(PLAN_CATALOG), addOns: TOKEN_ADD_ONS }
  }

  async summary(workspaceId: string) {
    const subscription = await this.ensureAccount(workspaceId)
    const [latest, transactions, orders] = await Promise.all([
      this.prisma.tokenTransaction.findFirst({ where: { workspaceId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
      this.prisma.tokenTransaction.findMany({
        where: { workspaceId, createdAt: { gte: subscription.currentPeriodStart } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, type: true, amount: true, balanceAfter: true, feature: true, model: true, createdAt: true },
      }),
      this.prisma.billingOrder.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' }, take: 8 }),
    ])
    const usage = transactions.filter(item => item.type === TokenTransactionType.USAGE)
    const usedTokens = usage.reduce((sum, item) => sum + Math.abs(item.amount), 0)
    const byFeature = Object.values(usage.reduce<Record<string, { feature: string; tokens: number; requests: number }>>((result, item) => {
      const feature = item.feature || 'other'
      result[feature] ||= { feature, tokens: 0, requests: 0 }
      result[feature].tokens += Math.abs(item.amount)
      result[feature].requests += 1
      return result
    }, {})).sort((a, b) => b.tokens - a.tokens)
    const daily = Object.values(usage.reduce<Record<string, { date: string; tokens: number }>>((result, item) => {
      const date = item.createdAt.toISOString().slice(0, 10)
      result[date] ||= { date, tokens: 0 }
      result[date].tokens += Math.abs(item.amount)
      return result
    }, {}))
    const balance = latest?.balanceAfter ?? 0
    return {
      subscription,
      plan: PLAN_CATALOG[subscription.plan],
      balance,
      usedTokens,
      usagePercent: subscription.includedTokens ? Math.min(100, Math.round((usedTokens / subscription.includedTokens) * 100)) : 0,
      projectedTokens: this.projectUsage(usedTokens, subscription.currentPeriodStart, subscription.currentPeriodEnd),
      byFeature,
      daily,
      recentTransactions: transactions.slice(-12).reverse(),
      recentOrders: orders,
      requiresUpgrade: balance <= Math.max(2_000, Math.round(subscription.includedTokens * 0.1)),
    }
  }

  transactions(workspaceId: string) {
    return this.prisma.tokenTransaction.findMany({
      where: { workspaceId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
      include: { actor: { select: { id: true, name: true, email: true } } },
    })
  }

  async changePlan(workspaceId: string, actorId: string, plan: ServicePlan) {
    const current = await this.ensureAccount(workspaceId)
    if (current.plan === plan) throw new ConflictException('Workspace đang sử dụng gói này')
    const target = PLAN_CATALOG[plan]
    await this.prisma.$transaction(async tx => {
      const latest = await tx.tokenTransaction.findFirst({ where: { workspaceId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })
      const grant = Math.max(0, target.includedTokens - current.includedTokens)
      await tx.workspaceSubscription.update({
        where: { workspaceId },
        data: { plan, status: SubscriptionStatus.ACTIVE, includedTokens: target.includedTokens, monthlyPriceCents: target.monthlyPrice },
      })
      await tx.billingOrder.create({
        data: {
          workspaceId,
          createdById: actorId,
          type: BillingOrderType.PLAN_CHANGE,
          targetPlan: plan,
          priceCents: target.monthlyPrice,
          status: BillingOrderStatus.COMPLETED,
          reference: `manual-${randomUUID()}`,
          note: 'Kích hoạt trực tiếp ở chế độ thanh toán thủ công.',
          completedAt: new Date(),
        },
      })
      if (grant > 0) {
        await tx.tokenTransaction.create({
          data: {
            workspaceId,
            actorId,
            type: TokenTransactionType.PLAN_GRANT,
            amount: grant,
            balanceAfter: (latest?.balanceAfter ?? 0) + grant,
            feature: 'plan-upgrade',
            metadata: { from: current.plan, to: plan },
          },
        })
      }
      await tx.auditLog.create({
        data: { workspaceId, actorId, action: 'billing.plan_changed', entityType: 'WorkspaceSubscription', metadata: { from: current.plan, to: plan } },
      })
    })
    return this.summary(workspaceId)
  }

  async buyTokens(workspaceId: string, actorId: string, packageCode: string) {
    await this.ensureAccount(workspaceId)
    const item = TOKEN_ADD_ONS.find(candidate => candidate.code === packageCode)
    if (!item) throw new NotFoundException('Không tìm thấy gói token')
    await this.prisma.$transaction(async tx => {
      const latest = await tx.tokenTransaction.findFirst({ where: { workspaceId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })
      await tx.billingOrder.create({
        data: {
          workspaceId,
          createdById: actorId,
          type: BillingOrderType.TOKEN_ADD_ON,
          tokenAmount: item.tokens,
          priceCents: item.price,
          status: BillingOrderStatus.COMPLETED,
          reference: `manual-${randomUUID()}`,
          note: 'Kích hoạt trực tiếp ở chế độ thanh toán thủ công.',
          completedAt: new Date(),
        },
      })
      await tx.tokenTransaction.create({
        data: {
          workspaceId,
          actorId,
          type: TokenTransactionType.ADD_ON,
          amount: item.tokens,
          balanceAfter: (latest?.balanceAfter ?? 0) + item.tokens,
          feature: packageCode.toLowerCase(),
        },
      })
      await tx.auditLog.create({
        data: { workspaceId, actorId, action: 'billing.tokens_purchased', entityType: 'BillingOrder', metadata: { packageCode, tokens: item.tokens } },
      })
    })
    return this.summary(workspaceId)
  }

  async consume(workspaceId: string, actorId: string, feature: string, amount: number, metadata?: Prisma.InputJsonValue) {
    if (!workspaceId || amount <= 0) return
    const subscription = await this.ensureAccount(workspaceId)
    return this.prisma.$transaction(async tx => {
      const latest = await tx.tokenTransaction.findFirst({ where: { workspaceId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })
      const balance = latest?.balanceAfter ?? 0
      if (balance < amount) {
        throw new HttpException({
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          code: 'TOKEN_LIMIT_EXCEEDED',
          message: 'Workspace không đủ token để thực hiện tác vụ này.',
          requiredTokens: amount,
          balance,
          plan: subscription.plan,
        }, HttpStatus.PAYMENT_REQUIRED)
      }
      return tx.tokenTransaction.create({
        data: {
          workspaceId,
          actorId,
          type: TokenTransactionType.USAGE,
          amount: -amount,
          balanceAfter: balance - amount,
          feature,
          metadata,
        },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  }

  async assertAvailable(workspaceId: string, amount: number) {
    const subscription = await this.ensureAccount(workspaceId)
    const latest = await this.prisma.tokenTransaction.findFirst({ where: { workspaceId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })
    const balance = latest?.balanceAfter ?? 0
    if (balance < amount) {
      throw new HttpException({
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        code: 'TOKEN_LIMIT_EXCEEDED',
        message: 'Workspace không đủ token để thực hiện tác vụ này.',
        requiredTokens: amount,
        balance,
        plan: subscription.plan,
      }, HttpStatus.PAYMENT_REQUIRED)
    }
  }

  private async ensureAccount(workspaceId: string) {
    let subscription = await this.prisma.workspaceSubscription.findUnique({ where: { workspaceId } })
    if (!subscription) {
      const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } })
      if (!workspace) throw new NotFoundException('Không tìm thấy workspace')
      const start = new Date()
      subscription = await this.prisma.workspaceSubscription.create({
        data: {
          workspaceId,
          plan: ServicePlan.FREE,
          includedTokens: PLAN_CATALOG.FREE.includedTokens,
          monthlyPriceCents: 0,
          currentPeriodStart: start,
          currentPeriodEnd: this.addMonth(start),
        },
      }).catch(() => this.prisma.workspaceSubscription.findUniqueOrThrow({ where: { workspaceId } }))
    }
    const latest = await this.prisma.tokenTransaction.findFirst({ where: { workspaceId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })
    if (!latest) {
      await this.prisma.tokenTransaction.create({
        data: {
          workspaceId,
          type: TokenTransactionType.PLAN_GRANT,
          amount: subscription.includedTokens,
          balanceAfter: subscription.includedTokens,
          feature: 'initial-plan-grant',
          requestId: `initial-plan-grant:${workspaceId}`,
        },
      }).catch(() => undefined)
    }
    return subscription
  }

  private addMonth(date: Date) {
    const result = new Date(date)
    result.setUTCMonth(result.getUTCMonth() + 1)
    return result
  }

  private projectUsage(used: number, start: Date, end: Date) {
    const elapsed = Math.max(1, Date.now() - start.getTime())
    const period = Math.max(elapsed, end.getTime() - start.getTime())
    return Math.round(used * (period / elapsed))
  }
}
