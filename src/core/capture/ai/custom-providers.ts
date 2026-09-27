import { keyFor, migrateApiKeys } from './keys';
import {
  AI_PROVIDERS,
  type AIProviderConfig,
  type AIProviderSelection,
  CUSTOM_MODEL_VALUE,
  customProviderIdOf,
  DEFAULT_AI_PROVIDER,
  isCustomProviderSelection,
  isProviderKey,
  normalizeBaseUrl,
} from './models';

export interface AICustomModel {
  id: string;
  label: string;
}

export interface AICustomHeader {
  name: string;
  value: string;
}

export interface AICustomProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: AICustomModel[];
  headers: AICustomHeader[];
}

export type CustomProviderMap = Record<string, AICustomProvider>;

/** Provider IDs mirror opencode: lowercase letters, numbers, hyphens, underscores. */
export const CUSTOM_PROVIDER_ID_PATTERN = /^[a-z0-9_-]+$/;

export type CustomProviderIdError = 'required' | 'format' | 'taken';

function trimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeModels(value: unknown): AICustomModel[] {
  if (!Array.isArray(value)) return [];
  const models: AICustomModel[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const id = trimmed((entry as { id?: unknown }).id);
    if (!id) continue;
    const label = trimmed((entry as { label?: unknown }).label) || id;
    if (models.some((m) => m.id === id)) continue;
    models.push({ id, label });
  }
  return models;
}

function sanitizeHeaders(value: unknown): AICustomHeader[] {
  if (!Array.isArray(value)) return [];
  const headers: AICustomHeader[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const name = trimmed((entry as { name?: unknown }).name);
    const headerValue = trimmed((entry as { value?: unknown }).value);
    if (!name || !headerValue) continue;
    if (headers.some((h) => h.name.toLowerCase() === name.toLowerCase())) continue;
    headers.push({ name, value: headerValue });
  }
  return headers;
}

function sanitizeProvider(id: string, value: unknown): AICustomProvider | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const baseUrl = trimmed(record.baseUrl);
  if (!baseUrl) return null;
  return {
    id,
    name: trimmed(record.name) || id,
    baseUrl,
    apiKey: trimmed(record.apiKey),
    models: sanitizeModels(record.models),
    headers: sanitizeHeaders(record.headers),
  };
}

/** Reads the stored `aiCustomProviders` map, dropping malformed entries. */
export function parseCustomProviders(value: unknown): CustomProviderMap {
  if (typeof value !== 'object' || value === null) return {};
  const providers: CustomProviderMap = {};
  for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!CUSTOM_PROVIDER_ID_PATTERN.test(id)) continue;
    const provider = sanitizeProvider(id, entry);
    if (provider) providers[id] = provider;
  }
  return providers;
}

export function validateCustomProviderId(
  id: string,
  existingIds: string[],
  currentId?: string,
): CustomProviderIdError | null {
  const normalized = id.trim();
  if (!normalized) return 'required';
  if (!CUSTOM_PROVIDER_ID_PATTERN.test(normalized)) return 'format';
  if (normalized !== currentId && existingIds.includes(normalized)) return 'taken';
  return null;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface CustomProviderSaveErrors {
  id?: CustomProviderIdError;
  baseUrl?: 'required' | 'invalid';
  models?: 'required';
}

/** Save-time validation for the provider editor. Empty header/model rows are stripped before calling. */
export function validateCustomProviderForSave(
  draft: { id: string; baseUrl: string; models: AICustomModel[] },
  existingIds: string[],
  currentId?: string,
): CustomProviderSaveErrors {
  const errors: CustomProviderSaveErrors = {};
  const idError = validateCustomProviderId(draft.id, existingIds, currentId);
  if (idError) errors.id = idError;
  const baseUrl = draft.baseUrl.trim();
  if (!baseUrl) errors.baseUrl = 'required';
  else if (!isValidHttpUrl(baseUrl)) errors.baseUrl = 'invalid';
  if (!draft.models.some((m) => m.id.trim())) errors.models = 'required';
  return errors;
}

export function customProviderToConfig(provider: AICustomProvider): AIProviderConfig {
  return {
    label: provider.name || provider.id,
    protocol: 'openai',
    transport: 'chat',
    defaultBaseUrl: normalizeBaseUrl(provider.baseUrl),
    defaultModel: provider.models[0]?.id ?? '',
    models: [
      ...provider.models.map((m) => ({ id: m.id, label: m.label || m.id })),
      { id: CUSTOM_MODEL_VALUE, label: 'Custom' },
    ],
  };
}

export function customProviderHeaders(provider: AICustomProvider): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const header of provider.headers) {
    const name = header.name.trim();
    const value = header.value.trim();
    if (name && value) headers[name] = value;
  }
  return headers;
}

/** Resolves any provider selection (built-in or `custom:<id>`) to an effective config. */
export function resolveProviderConfig(selection: string, customs: CustomProviderMap): AIProviderConfig | undefined {
  if (isProviderKey(selection)) {
    return AI_PROVIDERS[selection];
  }
  if (isCustomProviderSelection(selection)) {
    const custom = customs[customProviderIdOf(selection)];
    return custom ? customProviderToConfig(custom) : undefined;
  }
  return undefined;
}

export function providerDisplayLabel(selection: string, customs: CustomProviderMap): string {
  if (isProviderKey(selection)) {
    return AI_PROVIDERS[selection].label;
  }
  if (isCustomProviderSelection(selection)) {
    const custom = customs[customProviderIdOf(selection)];
    if (custom) return custom.name || custom.id;
    return customProviderIdOf(selection);
  }
  return selection;
}

export interface AiRuntime {
  selection: AIProviderSelection;
  config: AIProviderConfig;
  label: string;
  apiKey: string;
  baseUrl: string | undefined;
  headers: Record<string, string>;
  model: string;
}

export interface AiRuntimeStored {
  aiProvider?: unknown;
  aiModel?: unknown;
  aiApiKeys?: unknown;
  aiApiKey?: unknown;
  aiBaseUrl?: unknown;
  aiCustomProviders?: unknown;
}

/**
 * Resolves the stored AI settings to everything needed for an inference call.
 * Returns null when there is no usable auth (no API key and no custom headers),
 * mirroring the previous "no key, no AI" behaviour. API keys stay optional for
 * custom providers when auth is managed via headers.
 */
export function resolveAiRuntime(stored: AiRuntimeStored): AiRuntime | null {
  const customs = parseCustomProviders(stored.aiCustomProviders);
  const keys = migrateApiKeys({
    aiApiKeys: stored.aiApiKeys,
    aiApiKey: stored.aiApiKey,
    aiProvider: stored.aiProvider,
  });

  if (isCustomProviderSelection(stored.aiProvider)) {
    const custom = customs[customProviderIdOf(stored.aiProvider)];
    if (!custom) return null;
    const config = customProviderToConfig(custom);
    const apiKey = custom.apiKey || keyFor(keys, stored.aiProvider) || '';
    const headers = customProviderHeaders(custom);
    if (!apiKey && Object.keys(headers).length === 0) return null;
    const model = trimmed(stored.aiModel) || config.defaultModel;
    if (!model) return null;
    return {
      selection: stored.aiProvider,
      config,
      label: custom.name || custom.id,
      apiKey,
      baseUrl: normalizeBaseUrl(custom.baseUrl),
      headers,
      model,
    };
  }

  const provider = isProviderKey(stored.aiProvider) ? stored.aiProvider : DEFAULT_AI_PROVIDER;
  const config: AIProviderConfig = AI_PROVIDERS[provider];
  const apiKey = keyFor(keys, provider);
  if (!apiKey) return null;
  return {
    selection: provider,
    config,
    label: config.label,
    apiKey,
    baseUrl: trimmed(stored.aiBaseUrl) || undefined,
    headers: {},
    model: trimmed(stored.aiModel) || config.defaultModel,
  };
}

/** Storage keys that feed `resolveAiRuntime`. */
export const AI_RUNTIME_SETTINGS = [
  'aiApiKeys',
  'aiApiKey',
  'aiProvider',
  'aiModel',
  'aiBaseUrl',
  'aiCustomProviders',
] as const;
