import { describe, expect, it } from 'vitest';
import {
  customProviderHeaders,
  customProviderToConfig,
  parseCustomProviders,
  providerDisplayLabel,
  resolveAiRuntime,
  resolveProviderConfig,
  validateCustomProviderForSave,
  validateCustomProviderId,
} from '../custom-providers';
import { keyFor, parseApiKeys } from '../keys';
import { isCustomProviderSelection, selectionForCustomProvider } from '../models';

const STORED_CUSTOM = {
  id: 'my-provider',
  name: 'My Provider',
  baseUrl: 'https://api.example.com/v1/',
  apiKey: 'sk-custom',
  models: [
    { id: 'model-a', label: 'Model A' },
    { id: 'model-b', label: '' },
  ],
  headers: [{ name: 'X-Team', value: 'red' }],
};

describe('selection helpers', () => {
  it('recognizes custom: selections', () => {
    expect(isCustomProviderSelection('custom:my-provider')).toBe(true);
    expect(isCustomProviderSelection('custom:')).toBe(false);
    expect(isCustomProviderSelection('openai')).toBe(false);
    expect(isCustomProviderSelection(undefined)).toBe(false);
    expect(selectionForCustomProvider('my-provider')).toBe('custom:my-provider');
  });
});

describe('parseCustomProviders', () => {
  it('keeps well-formed providers and normalizes them', () => {
    expect(parseCustomProviders({ 'my-provider': STORED_CUSTOM })).toEqual({
      'my-provider': {
        id: 'my-provider',
        name: 'My Provider',
        baseUrl: 'https://api.example.com/v1/',
        apiKey: 'sk-custom',
        models: [
          { id: 'model-a', label: 'Model A' },
          { id: 'model-b', label: 'model-b' },
        ],
        headers: [{ name: 'X-Team', value: 'red' }],
      },
    });
  });

  it('drops ids outside the opencode-style pattern', () => {
    expect(parseCustomProviders({ 'My Provider': STORED_CUSTOM, 'bad!id': STORED_CUSTOM })).toEqual({});
  });

  it('drops entries without a base URL and non-objects', () => {
    expect(parseCustomProviders({ ok: { ...STORED_CUSTOM, baseUrl: '  ' }, nope: 42 })).toEqual({});
  });

  it('sanitizes models and headers', () => {
    const parsed = parseCustomProviders({
      p: {
        ...STORED_CUSTOM,
        models: [{ id: 'a', label: 'A' }, { id: 'a', label: 'dup' }, { id: '  ', label: 'blank' }, 'nope'],
        headers: [
          { name: 'X-A', value: '1' },
          { name: 'x-a', value: 'dup-case' },
          { name: 'X-Empty', value: '   ' },
          { name: '', value: 'no-name' },
        ],
      },
    });
    expect(parsed.p.models).toEqual([{ id: 'a', label: 'A' }]);
    expect(parsed.p.headers).toEqual([{ name: 'X-A', value: '1' }]);
  });

  it('reads anything that is not an object as no providers', () => {
    expect(parseCustomProviders(null)).toEqual({});
    expect(parseCustomProviders(undefined)).toEqual({});
    expect(parseCustomProviders('custom:my-provider')).toEqual({});
  });
});

describe('validateCustomProviderId', () => {
  it('requires a value matching the opencode-style pattern', () => {
    expect(validateCustomProviderId('', [])).toBe('required');
    expect(validateCustomProviderId('   ', [])).toBe('required');
    expect(validateCustomProviderId('My Provider', [])).toBe('format');
    expect(validateCustomProviderId('bad!id', [])).toBe('format');
    expect(validateCustomProviderId('my-provider_2', [])).toBeNull();
  });

  it('rejects ids that are already taken, except the one being edited', () => {
    expect(validateCustomProviderId('taken', ['taken'])).toBe('taken');
    expect(validateCustomProviderId('taken', ['taken'], 'taken')).toBeNull();
  });
});

describe('validateCustomProviderForSave', () => {
  it('passes a complete draft', () => {
    expect(
      validateCustomProviderForSave(
        { id: 'my-provider', baseUrl: 'https://api.example.com/v1', models: [{ id: 'm', label: 'M' }] },
        [],
      ),
    ).toEqual({});
  });

  it('reports id, base URL, and model problems together', () => {
    expect(validateCustomProviderForSave({ id: 'Bad Id', baseUrl: '', models: [] }, ['taken'])).toEqual({
      id: 'format',
      baseUrl: 'required',
      models: 'required',
    });
    expect(
      validateCustomProviderForSave({ id: 'taken', baseUrl: 'notaurl', models: [{ id: '  ', label: '' }] }, ['taken']),
    ).toEqual({ id: 'taken', baseUrl: 'invalid', models: 'required' });
  });

  it('accepts http(s) base URLs including localhost', () => {
    const errors = validateCustomProviderForSave(
      { id: 'local', baseUrl: 'http://localhost:11434/v1', models: [{ id: 'm', label: 'm' }] },
      [],
    );
    expect(errors).toEqual({});
  });
});

describe('customProviderToConfig and headers', () => {
  it('exposes an OpenAI-compatible config with the custom models first', () => {
    const config = customProviderToConfig(parseCustomProviders({ 'my-provider': STORED_CUSTOM })['my-provider']);
    expect(config.protocol).toBe('openai');
    expect(config.transport).toBe('chat');
    expect(config.label).toBe('My Provider');
    expect(config.defaultBaseUrl).toBe('https://api.example.com/v1');
    expect(config.defaultModel).toBe('model-a');
    expect(config.models.map((m) => m.id)).toEqual(['model-a', 'model-b', 'mimik-custom-model']);
  });

  it('reads the header map', () => {
    const parsed = parseCustomProviders({ 'my-provider': STORED_CUSTOM });
    expect(customProviderHeaders(parsed['my-provider'])).toEqual({ 'X-Team': 'red' });
  });
});

describe('resolveProviderConfig and providerDisplayLabel', () => {
  const customs = parseCustomProviders({ 'my-provider': STORED_CUSTOM });

  it('resolves built-ins and customs, and nothing else', () => {
    expect(resolveProviderConfig('openai', customs)?.label).toBe('OpenAI');
    expect(resolveProviderConfig('custom:my-provider', customs)?.defaultModel).toBe('model-a');
    expect(resolveProviderConfig('custom:gone', customs)).toBeUndefined();
    expect(resolveProviderConfig('nope', customs)).toBeUndefined();
  });

  it('labels customs by display name and falls back to the id', () => {
    expect(providerDisplayLabel('custom:my-provider', customs)).toBe('My Provider');
    expect(providerDisplayLabel('openai', customs)).toBe('OpenAI');
    expect(providerDisplayLabel('custom:gone', customs)).toBe('gone');
  });
});

describe('resolveAiRuntime', () => {
  const customs = { 'my-provider': STORED_CUSTOM };

  it('resolves a built-in provider exactly like before', () => {
    const runtime = resolveAiRuntime({ aiProvider: 'openai', aiModel: 'gpt-4o', aiApiKeys: { openai: 'sk-a' } });
    expect(runtime).toMatchObject({ selection: 'openai', apiKey: 'sk-a', model: 'gpt-4o', headers: {} });
  });

  it('returns null for a built-in provider without a key', () => {
    expect(resolveAiRuntime({ aiProvider: 'openai', aiApiKeys: {} })).toBeNull();
  });

  it('resolves a custom provider with its own key, base URL, and headers', () => {
    const runtime = resolveAiRuntime({ aiProvider: 'custom:my-provider', aiCustomProviders: customs });
    expect(runtime).toMatchObject({
      selection: 'custom:my-provider',
      label: 'My Provider',
      apiKey: 'sk-custom',
      baseUrl: 'https://api.example.com/v1',
      model: 'model-a',
      headers: { 'X-Team': 'red' },
    });
  });

  it('prefers the selected custom model over the default', () => {
    const runtime = resolveAiRuntime({
      aiProvider: 'custom:my-provider',
      aiModel: 'model-b',
      aiCustomProviders: customs,
    });
    expect(runtime?.model).toBe('model-b');
  });

  it('allows header-only auth with an empty key, opencode-style', () => {
    const headerOnly = {
      'my-provider': { ...STORED_CUSTOM, apiKey: '', headers: [{ name: 'Authorization', value: 'Bearer tok' }] },
    };
    const runtime = resolveAiRuntime({ aiProvider: 'custom:my-provider', aiCustomProviders: headerOnly });
    expect(runtime).toMatchObject({ apiKey: '', headers: { Authorization: 'Bearer tok' } });
  });

  it('returns null when a custom provider has neither key nor headers', () => {
    const bare = { 'my-provider': { ...STORED_CUSTOM, apiKey: '', headers: [] } };
    expect(resolveAiRuntime({ aiProvider: 'custom:my-provider', aiCustomProviders: bare })).toBeNull();
  });

  it('returns null when the selected custom provider no longer exists', () => {
    expect(resolveAiRuntime({ aiProvider: 'custom:gone', aiCustomProviders: customs })).toBeNull();
  });

  it('falls back to openai for an unknown selection with a usable key', () => {
    const runtime = resolveAiRuntime({ aiProvider: 'nope', aiApiKeys: { openai: 'sk-a' } });
    expect(runtime).toMatchObject({ selection: 'openai', apiKey: 'sk-a' });
  });
});

describe('api keys keep custom selections', () => {
  it('preserves custom: keys while dropping unknown providers', () => {
    expect(parseApiKeys({ openai: 'sk-a', 'custom:my-provider': 'sk-c', nope: 'sk-x' })).toEqual({
      openai: 'sk-a',
      'custom:my-provider': 'sk-c',
    });
    expect(keyFor({ openai: 'sk-a' }, 'custom:my-provider')).toBe('');
  });
});
