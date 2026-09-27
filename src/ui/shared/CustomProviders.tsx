import { Pencil, Plus, Server, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { i18n } from '#imports';
import {
  type AICustomHeader,
  type AICustomModel,
  type AICustomProvider,
  type CustomProviderMap,
  type CustomProviderSaveErrors,
  validateCustomProviderForSave,
} from '@/core/capture/ai/custom-providers';
import { selectionForCustomProvider } from '@/core/capture/ai/models';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { KeyStatusNote, KeyWarningNote, ModelList, SecretInput, useKeyCheck } from '@/ui/shared/key-check';

interface ProviderDraft {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: (AICustomModel & { rowKey: string })[];
  headers: (AICustomHeader & { rowKey: string })[];
}

let rowCounter = 0;
function nextRowKey(): string {
  rowCounter += 1;
  return `row-${rowCounter}`;
}

const BLANK_MODEL = (): AICustomModel & { rowKey: string } => ({ id: '', label: '', rowKey: nextRowKey() });
const BLANK_HEADER = (): AICustomHeader & { rowKey: string } => ({ name: '', value: '', rowKey: nextRowKey() });

function blankDraft(): ProviderDraft {
  return { id: '', name: '', baseUrl: '', apiKey: '', models: [BLANK_MODEL()], headers: [] };
}

function draftFrom(id: string, providers: CustomProviderMap): ProviderDraft {
  const existing = providers[id];
  if (!existing) return blankDraft();
  return {
    id: existing.id,
    name: existing.name,
    baseUrl: existing.baseUrl,
    apiKey: existing.apiKey,
    models: existing.models.length > 0 ? existing.models.map((m) => ({ ...m, rowKey: nextRowKey() })) : [BLANK_MODEL()],
    headers: existing.headers.map((h) => ({ ...h, rowKey: nextRowKey() })),
  };
}

const ID_ERROR_KEYS: Record<string, string> = {
  required: 'settings.providerIdRequired',
  format: 'settings.providerIdInvalid',
  taken: 'settings.providerIdTaken',
};

export interface CustomProviderEditorProps {
  providers: CustomProviderMap;
  currentId: string | null;
  onSave: (provider: AICustomProvider) => void;
  onCancel: () => void;
}

export function CustomProviderEditor({ providers, currentId, onSave, onCancel }: CustomProviderEditorProps) {
  const [draft, setDraft] = useState<ProviderDraft>(() => draftFrom(currentId ?? '', providers));
  const [errors, setErrors] = useState<CustomProviderSaveErrors>({});
  const keyCheck = useKeyCheck();

  const patchDraft = (patch: Partial<ProviderDraft>) => {
    keyCheck.reset();
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const firstModel = draft.models.find((m) => m.id.trim())?.id.trim() ?? '';
  const draftHeaders: Record<string, string> = {};
  for (const header of draft.headers) {
    if (header.name.trim() && header.value.trim()) draftHeaders[header.name.trim()] = header.value.trim();
  }
  const canCheck =
    !!draft.id.trim() &&
    !!draft.baseUrl.trim() &&
    !!firstModel &&
    (!!draft.apiKey.trim() || Object.keys(draftHeaders).length > 0);

  const handleSave = () => {
    const models = draft.models
      .filter((m) => m.id.trim())
      .map((m) => ({ id: m.id.trim(), label: m.label.trim() || m.id.trim() }));
    const headers = draft.headers
      .filter((h) => h.name.trim() && h.value.trim())
      .map((h) => ({ name: h.name.trim(), value: h.value.trim() }));
    const nextId = draft.id.trim();
    const validation = validateCustomProviderForSave(
      { id: draft.id, baseUrl: draft.baseUrl, models },
      Object.keys(providers),
      currentId ?? undefined,
    );
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    onSave({
      id: nextId,
      name: draft.name.trim() || nextId,
      baseUrl: draft.baseUrl.trim(),
      apiKey: draft.apiKey.trim(),
      models,
      headers,
    });
  };

  return (
    <div className="border border-accent/40 rounded-lg p-2.5 space-y-2.5 bg-secondary/40">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-foreground">
          {currentId ? i18n.t('settings.editProvider') : i18n.t('settings.addProvider')}
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label={i18n.t('common.close')}
          className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-semibold text-foreground mb-1">
            {i18n.t('settings.providerId')}
          </label>
          <Input
            value={draft.id}
            onChange={(e) => patchDraft({ id: e.target.value })}
            placeholder="my-provider"
            autoComplete="off"
            spellCheck={false}
            className="h-8 text-[13px] rounded-lg border-border font-mono"
          />
          {errors.id && (
            <p className="mt-1 text-[10px] text-destructive" role="alert">
              {i18n.t(ID_ERROR_KEYS[errors.id])}
            </p>
          )}
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-foreground mb-1">
            {i18n.t('settings.displayName')}
          </label>
          <Input
            value={draft.name}
            onChange={(e) => patchDraft({ name: e.target.value })}
            placeholder="My Provider"
            autoComplete="off"
            className="h-8 text-[13px] rounded-lg border-border"
          />
        </div>
      </div>
      <p className="-mt-1 text-[10px] text-muted-foreground leading-relaxed">{i18n.t('settings.providerIdHint')}</p>

      <div>
        <label className="block text-[11px] font-semibold text-foreground mb-1">{i18n.t('settings.baseUrl')}</label>
        <Input
          value={draft.baseUrl}
          onChange={(e) => patchDraft({ baseUrl: e.target.value })}
          placeholder="https://api.example.com/v1"
          autoComplete="off"
          spellCheck={false}
          className="h-8 text-[13px] rounded-lg border-border font-mono"
        />
        {errors.baseUrl && (
          <p className="mt-1 text-[10px] text-destructive" role="alert">
            {i18n.t(
              errors.baseUrl === 'required' ? 'settings.providerBaseUrlRequired' : 'settings.providerBaseUrlInvalid',
            )}
          </p>
        )}
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-foreground mb-1">{i18n.t('settings.apiKey')}</label>
        <div className="flex items-center gap-1.5">
          <SecretInput
            value={draft.apiKey}
            onChange={(next) => patchDraft({ apiKey: next })}
            placeholder="sk-..."
            className="h-8 text-[13px] rounded-lg border-border"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!canCheck || keyCheck.status === 'checking'}
            onClick={() => {
              if (keyCheck.status === 'checking') return;
              void keyCheck.check(
                selectionForCustomProvider(draft.id.trim()),
                draft.apiKey.trim(),
                draft.baseUrl.trim(),
                firstModel,
                Object.keys(draftHeaders).length > 0 ? draftHeaders : undefined,
              );
            }}
            className="h-8 shrink-0 rounded-lg bg-card text-[11px] font-semibold"
          >
            {i18n.t('settings.checkKey')}
          </Button>
        </div>
        <KeyStatusNote status={keyCheck.status} />
        <KeyWarningNote warning={keyCheck.warning} />
        {keyCheck.models && <ModelList models={keyCheck.models} />}
        <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
          {i18n.t('settings.apiKeyOptionalHint')}
        </p>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-foreground mb-1">{i18n.t('settings.models')}</label>
        <div className="space-y-1.5">
          {draft.models.map((model, index) => (
            <div key={model.rowKey} className="flex items-center gap-1.5">
              <Input
                value={model.id}
                onChange={(e) =>
                  patchDraft({
                    models: draft.models.map((m, i) => (i === index ? { ...m, id: e.target.value } : m)),
                  })
                }
                placeholder={i18n.t('settings.modelId')}
                autoComplete="off"
                spellCheck={false}
                aria-label={i18n.t('settings.modelId')}
                className="h-8 text-[12px] rounded-lg border-border font-mono"
              />
              <Input
                value={model.label}
                onChange={(e) =>
                  patchDraft({
                    models: draft.models.map((m, i) => (i === index ? { ...m, label: e.target.value } : m)),
                  })
                }
                placeholder={i18n.t('settings.modelName')}
                autoComplete="off"
                aria-label={i18n.t('settings.modelName')}
                className="h-8 text-[12px] rounded-lg border-border"
              />
              <button
                type="button"
                onClick={() => patchDraft({ models: draft.models.filter((_, i) => i !== index) })}
                disabled={draft.models.length <= 1 && !model.id && !model.label}
                aria-label={i18n.t('common.delete')}
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors disabled:opacity-30"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        {errors.models && (
          <p className="mt-1 text-[10px] text-destructive" role="alert">
            {i18n.t('settings.providerModelsRequired')}
          </p>
        )}
        <button
          type="button"
          onClick={() => patchDraft({ models: [...draft.models, BLANK_MODEL()] })}
          className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border text-[10px] font-semibold text-foreground hover:border-accent transition-colors"
        >
          <Plus size={11} />
          {i18n.t('settings.addModel')}
        </button>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-foreground mb-1">{i18n.t('settings.headers')}</label>
        <div className="space-y-1.5">
          {draft.headers.map((header, index) => (
            <div key={header.rowKey} className="flex items-center gap-1.5">
              <Input
                value={header.name}
                onChange={(e) =>
                  patchDraft({
                    headers: draft.headers.map((h, i) => (i === index ? { ...h, name: e.target.value } : h)),
                  })
                }
                placeholder={i18n.t('settings.headerName')}
                autoComplete="off"
                spellCheck={false}
                aria-label={i18n.t('settings.headerName')}
                className="h-8 text-[12px] rounded-lg border-border font-mono"
              />
              <Input
                value={header.value}
                onChange={(e) =>
                  patchDraft({
                    headers: draft.headers.map((h, i) => (i === index ? { ...h, value: e.target.value } : h)),
                  })
                }
                placeholder={i18n.t('settings.headerValue')}
                autoComplete="off"
                spellCheck={false}
                aria-label={i18n.t('settings.headerValue')}
                className="h-8 text-[12px] rounded-lg border-border font-mono"
              />
              <button
                type="button"
                onClick={() => patchDraft({ headers: draft.headers.filter((_, i) => i !== index) })}
                aria-label={i18n.t('common.delete')}
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => patchDraft({ headers: [...draft.headers, BLANK_HEADER()] })}
          className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border text-[10px] font-semibold text-foreground hover:border-accent transition-colors"
        >
          <Plus size={11} />
          {i18n.t('settings.addHeader')}
        </button>
      </div>

      <div className="flex items-center justify-end gap-1.5 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} className="h-8 rounded-lg text-[11px]">
          {i18n.t('common.cancel')}
        </Button>
        <Button size="sm" onClick={handleSave} className="h-8 rounded-lg text-[11px]">
          {i18n.t('common.save')}
        </Button>
      </div>
    </div>
  );
}

interface CustomProvidersSectionProps {
  providers: CustomProviderMap;
  selectedId: string | null;
  onChange: (next: CustomProviderMap) => void;
  onPickProvider: (selection: string, customs: CustomProviderMap) => void;
}

export default function CustomProvidersSection({
  providers,
  selectedId,
  onChange,
  onPickProvider,
}: CustomProvidersSectionProps) {
  const [editingId, setEditingId] = useState<string | null | undefined>(undefined);

  const entries = Object.values(providers).sort((a, b) => a.id.localeCompare(b.id));
  const editing = editingId !== undefined;

  const handleEditorSave = (provider: AICustomProvider) => {
    const next: CustomProviderMap = { ...providers };
    if (editingId && editingId !== provider.id) delete next[editingId];
    next[provider.id] = provider;
    onChange(next);
    onPickProvider(selectionForCustomProvider(provider.id), next);
    setEditingId(undefined);
  };

  const handleDelete = (id: string) => {
    const target = providers[id];
    if (!target) return;
    if (!window.confirm(i18n.t('settings.deleteProviderConfirm', [target.name || target.id]))) return;
    const next: CustomProviderMap = { ...providers };
    delete next[id];
    onChange(next);
    if (editingId === id) setEditingId(undefined);
    if (selectedId === id) onPickProvider('openai', next);
  };

  return (
    <div className="border border-border rounded-[10px] p-3.5 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
          <Server size={14} className="text-accent" />
        </div>
        <span className="text-xs font-bold text-foreground">{i18n.t('settings.customProviders')}</span>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border text-[11px] font-semibold text-foreground hover:border-accent transition-colors"
          >
            <Plus size={12} />
            {i18n.t('settings.addProvider')}
          </button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">{i18n.t('settings.customProvidersHint')}</p>

      {entries.length === 0 && !editing && (
        <p className="text-[11px] text-muted-foreground">{i18n.t('settings.noCustomProviders')}</p>
      )}

      {entries.map((provider) => (
        <div key={provider.id} className="border border-border rounded-lg px-2.5 py-2 space-y-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold text-foreground truncate">{provider.name || provider.id}</div>
              <div className="text-[10px] text-muted-foreground truncate font-mono">
                {provider.id} · {provider.baseUrl} ·{' '}
                {i18n.t('settings.providerModelCount', [String(provider.models.length)])}
              </div>
            </div>
            {selectedId === provider.id ? (
              <span className="shrink-0 px-2 py-1 rounded-md bg-secondary text-[10px] font-bold text-accent">
                {i18n.t('settings.inUse')}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onPickProvider(selectionForCustomProvider(provider.id), providers)}
                className="shrink-0 px-2 py-1 rounded-md border border-border text-[10px] font-semibold text-foreground hover:border-accent transition-colors"
              >
                {i18n.t('settings.useProvider')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditingId(provider.id)}
              aria-label={i18n.t('settings.editProvider')}
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(provider.id)}
              aria-label={i18n.t('common.delete')}
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}

      {editing && (
        <CustomProviderEditor
          key={editingId ?? '__new__'}
          providers={providers}
          currentId={editingId}
          onSave={handleEditorSave}
          onCancel={() => setEditingId(undefined)}
        />
      )}
    </div>
  );
}
