import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { type AIProviderConfig, findProvider, openAITransport, resolveBaseUrl } from './models';

export function createModel(
  provider: string,
  model: string,
  apiKey: string,
  baseUrl?: string,
  headers?: Record<string, string>,
) {
  const config: AIProviderConfig = findProvider(provider) ?? {
    label: provider,
    protocol: 'openai',
    transport: 'chat',
    defaultBaseUrl: baseUrl?.trim() || '',
    defaultModel: model,
    models: [],
  };
  const baseURL = resolveBaseUrl(config, baseUrl);
  const extraHeaders = headers && Object.keys(headers).length > 0 ? headers : undefined;
  if (config.protocol === 'anthropic') return createAnthropic({ apiKey, baseURL })(model);
  const openai = createOpenAI({
    apiKey,
    baseURL,
    ...(extraHeaders ? { headers: extraHeaders } : {}),
    name: provider,
  });
  return openAITransport(config, baseUrl) === 'responses' ? openai(model) : openai.chat(model);
}
