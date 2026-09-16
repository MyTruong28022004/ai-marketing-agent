import { ConfigService } from '@nestjs/config'
import OpenAI from 'openai'

export type AiProvider = 'codex-local' | 'codex-gateway' | 'openai'

export type AiRuntime = {
  provider: AiProvider
  model: string | undefined
  client: OpenAI | null
}

const DEFAULT_GATEWAY_URL = 'http://127.0.0.1:8787/codex/v1'
const DEFAULT_GATEWAY_MODEL = 'gpt-5.6-sol'

export function createAiRuntime(config: ConfigService, timeout: number): AiRuntime {
  const requestedProvider = config.get<string>('AI_PROVIDER')?.trim()
  const provider: AiProvider = requestedProvider === 'openai' || requestedProvider === 'codex-gateway'
    ? requestedProvider
    : 'codex-local'

  if (provider === 'codex-local') {
    return {
      provider,
      model: config.get<string>('CODEX_MODEL')?.trim() || undefined,
      client: null,
    }
  }

  if (provider === 'codex-gateway') {
    const baseURL = config.get<string>('AI_GATEWAY_BASE_URL')?.trim().replace(/\/+$/, '') || DEFAULT_GATEWAY_URL
    const apiKey = config.get<string>('AI_GATEWAY_API_KEY')?.trim() || 'codex2claudecode'
    const model = config.get<string>('AI_GATEWAY_MODEL')?.trim()
      || config.get<string>('CODEX_MODEL')?.trim()
      || DEFAULT_GATEWAY_MODEL

    return {
      provider,
      model,
      client: new OpenAI({ apiKey, baseURL, timeout, maxRetries: 1 }),
    }
  }

  const apiKey = config.get<string>('OPENAI_API_KEY')?.trim()
  return {
    provider,
    model: config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-5-mini',
    client: apiKey ? new OpenAI({ apiKey, timeout, maxRetries: 1 }) : null,
  }
}

export function gatewayReasoning(provider: AiProvider, effort: 'low' | 'medium') {
  return provider === 'codex-gateway' ? { reasoning: { effort } } as const : {}
}
