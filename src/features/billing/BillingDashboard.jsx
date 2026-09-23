import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, Check, Coins, CreditCard, Gauge, PackagePlus, ReceiptText, RefreshCw, ShieldCheck, Sparkles, TrendingUp, Zap } from 'lucide-react'
import { apiRequest } from '../../lib/api'

const number = value => new Intl.NumberFormat('vi-VN').format(value || 0)
const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0)
const featureNames = {
  'website-analysis': 'Phân tích website',
  'competitor-discovery': 'Khám phá đối thủ',
  'competitor-intelligence': 'Market Intelligence',
  'video-project': 'Tạo dự án video',
  'video-assets': 'Tạo asset video',
  'custom-voice': 'Custom Voice',
}

export default function BillingDashboard({ workspaceId, role, showToast }) {
  const [catalog, setCatalog] = useState({ plans: [], addOns: [] })
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [catalogData, summaryData] = await Promise.all([
        apiRequest(`/workspaces/${workspaceId}/billing/catalog`),
        apiRequest(`/workspaces/${workspaceId}/billing/summary`),
      ])
      setCatalog(catalogData)
      setSummary(summaryData)
    } finally { setLoading(false) }
  }, [workspaceId])

  useEffect(() => { load().catch(error => showToast(error.message)) }, [load, showToast])
  const maxDaily = useMemo(() => Math.max(1, ...(summary?.daily || []).map(item => item.tokens)), [summary])

  const changePlan = async plan => {
    if (role !== 'ADMIN' || plan === summary.subscription.plan) return
    if (!window.confirm(`Chuyển workspace sang gói ${plan}?`)) return
    setProcessing(plan)
    try {
      setSummary(await apiRequest(`/workspaces/${workspaceId}/billing/plan`, { method: 'POST', body: JSON.stringify({ plan }) }))
      showToast('Đã cập nhật gói dịch vụ')
    } catch (error) { showToast(error.message) }
    finally { setProcessing('') }
  }

  const buy = async packageCode => {
    if (role !== 'ADMIN') return
    setProcessing(packageCode)
    try {
      setSummary(await apiRequest(`/workspaces/${workspaceId}/billing/tokens`, { method: 'POST', body: JSON.stringify({ packageCode }) }))
      showToast('Đã cộng token vào workspace')
    } catch (error) { showToast(error.message) }
    finally { setProcessing('') }
  }

  if (loading || !summary) return <div className="admin-empty token-loading"><RefreshCw className="spin" size={22}/> Đang tải dữ liệu token...</div>
  const percent = Math.min(100, summary.usagePercent)
  return <div className="billing-page">
    <div className="admin-heading">
      <div><span className="eyebrow">USAGE & BILLING</span><h1>Quản lý token</h1><p>Theo dõi chi phí AI, dự báo mức dùng và nâng cấp trước khi gián đoạn.</p></div>
      <div className="current-plan"><span><Sparkles size={17}/></span><div><small>Gói hiện tại</small><b>{summary.plan.name}</b></div><em>{summary.subscription.status === 'ACTIVE' ? 'Đang hoạt động' : summary.subscription.status}</em></div>
    </div>

    {summary.requiresUpgrade && <div className="token-alert"><AlertTriangle size={20}/><div><b>Token sắp hết</b><span>Chỉ còn {number(summary.balance)} token. Nâng cấp gói hoặc mua thêm để các tác vụ AI không bị gián đoạn.</span></div>{role === 'ADMIN' && <button onClick={() => document.getElementById('service-plans')?.scrollIntoView({ behavior: 'smooth' })}>Xem lựa chọn <ArrowUpRight size={15}/></button>}</div>}

    <div className="token-overview">
      <section className="token-balance-card">
        <div className="token-card-head"><span><Coins size={20}/></span><div><small>Số dư khả dụng</small><b>{number(summary.balance)}</b><em>token</em></div></div>
        <div className="token-progress"><i style={{ width: `${percent}%` }}/></div>
        <div className="token-progress-meta"><span>Đã dùng <b>{number(summary.usedTokens)}</b></span><span>Hạn mức <b>{number(summary.subscription.includedTokens)}</b></span></div>
        <div className="period-note">Chu kỳ {new Date(summary.subscription.currentPeriodStart).toLocaleDateString('vi-VN')} – {new Date(summary.subscription.currentPeriodEnd).toLocaleDateString('vi-VN')}</div>
      </section>
      <article className="token-mini-card"><span className="kpi-icon purple"><Gauge size={19}/></span><small>Mức sử dụng</small><b>{percent}%</b><em>{100 - percent}% hạn mức còn lại</em></article>
      <article className="token-mini-card"><span className="kpi-icon amber"><TrendingUp size={19}/></span><small>Dự báo cuối kỳ</small><b>{number(summary.projectedTokens)}</b><em>{summary.projectedTokens > summary.subscription.includedTokens ? 'Có nguy cơ vượt hạn mức' : 'Trong hạn mức gói'}</em></article>
      <article className="token-mini-card"><span className="kpi-icon green"><ReceiptText size={19}/></span><small>Tác vụ AI</small><b>{summary.recentTransactions.filter(item => item.type === 'USAGE').length}</b><em>Giao dịch gần đây</em></article>
    </div>

    <div className="billing-analytics">
      <section className="admin-card usage-chart-card"><div className="card-title"><span><Zap size={18}/></span><div><h2>Tiêu thụ theo ngày</h2><p>Token đã ghi nhận trong chu kỳ hiện tại</p></div></div><div className="usage-bars">{summary.daily.length ? summary.daily.map(item => <div key={item.date}><span style={{ height: `${Math.max(8, item.tokens / maxDaily * 100)}%` }}/><b>{number(item.tokens)}</b><small>{new Date(`${item.date}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</small></div>) : <div className="chart-empty">Chưa có tác vụ tính token trong chu kỳ này.</div>}</div></section>
      <section className="admin-card feature-usage-card"><div className="card-title"><span><Gauge size={18}/></span><div><h2>Chi phí theo tính năng</h2><p>Nhóm tác vụ dùng nhiều token nhất</p></div></div>{summary.byFeature.length ? <div className="feature-usage">{summary.byFeature.map(item => <div key={item.feature}><span><b>{featureNames[item.feature] || item.feature}</b><small>{item.requests} tác vụ</small></span><strong>{number(item.tokens)}</strong><i><b style={{ width: `${Math.min(100, item.tokens / Math.max(1, summary.usedTokens) * 100)}%` }}/></i></div>)}</div> : <div className="admin-empty">Chưa có dữ liệu sử dụng.</div>}</section>
    </div>

    <section className="service-section" id="service-plans"><div className="section-heading"><div><span className="eyebrow">GÓI DỊCH VỤ</span><h2>Chọn hạn mức phù hợp</h2><p>Basic được thiết kế cho đội ngũ đang tăng trưởng; có thể mua token bổ sung bất cứ lúc nào.</p></div><span className="manual-billing"><ShieldCheck size={16}/> Chế độ thanh toán thủ công</span></div><div className="plan-grid">{catalog.plans.map(plan => <article className={`plan-option ${plan.recommended ? 'recommended' : ''} ${summary.subscription.plan === plan.code ? 'current' : ''}`} key={plan.code}>{plan.recommended && <span className="recommended-label">KHUYẾN NGHỊ</span>}<header><span>{plan.name}</span>{summary.subscription.plan === plan.code && <em><Check size={13}/> Hiện tại</em>}</header><div className="plan-price"><b>{money(plan.monthlyPrice)}</b><small>/ tháng</small></div><p>{plan.description}</p><strong>{number(plan.includedTokens)} token</strong><ul>{plan.features.map(feature => <li key={feature}><Check size={14}/>{feature}</li>)}</ul><button disabled={role !== 'ADMIN' || summary.subscription.plan === plan.code || processing === plan.code} onClick={() => changePlan(plan.code)}>{processing === plan.code ? 'Đang xử lý...' : summary.subscription.plan === plan.code ? 'Gói hiện tại' : plan.monthlyPrice > summary.plan.monthlyPrice ? 'Nâng cấp gói' : 'Chuyển gói'}</button></article>)}</div></section>

    <section className="add-on-section"><div className="section-heading"><div><span className="eyebrow">TOKEN BỔ SUNG</span><h2>Mua thêm khi cần</h2><p>Token bổ sung được cộng ngay và không làm thay đổi gói hiện tại.</p></div></div><div className="addon-grid">{catalog.addOns.map(item => <article key={item.code} className={item.recommended ? 'recommended' : ''}><span><PackagePlus size={20}/></span><div><b>{item.name}</b><small>{money(item.price)} · dùng ngay</small></div><button disabled={role !== 'ADMIN' || processing === item.code} onClick={() => buy(item.code)}>{processing === item.code ? 'Đang xử lý...' : 'Mua thêm'}</button></article>)}</div></section>

    <section className="admin-card transaction-card"><div className="card-title"><span><CreditCard size={18}/></span><div><h2>Giao dịch gần đây</h2><p>Sổ token minh bạch theo từng biến động</p></div></div><div className="transaction-table"><header><span>Thời gian</span><span>Loại</span><span>Tính năng</span><span>Biến động</span><span>Số dư</span></header>{summary.recentTransactions.map(item => <div key={item.id}><span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span><span>{item.type}</span><span>{featureNames[item.feature] || item.feature || 'Hệ thống'}</span><strong className={item.amount > 0 ? 'positive' : 'negative'}>{item.amount > 0 ? '+' : ''}{number(item.amount)}</strong><b>{number(item.balanceAfter)}</b></div>)}</div></section>
  </div>
}
