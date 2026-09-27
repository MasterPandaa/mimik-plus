import { AI_RUNTIME_SETTINGS, resolveAiRuntime } from '@/core/capture/ai/custom-providers';
import { getAIDescription } from '@/core/capture/ai/description';
import { describeAiFailure } from '@/core/capture/ai/errors';
import type { DOMContext } from '@/core/capture/dom/context';
import { actionSteps } from '@/core/guides/blocks';
import { applyAiDescription, getStepsForGuide } from '@/core/guides/service';
import type { ElementMeta, Step } from '@/core/guides/types';
import { localStorage } from '@/lib/browser-api';
import { logger } from '@/lib/logger';
import type { GenerateStepDescriptionsResponse } from '@/lib/messaging';
import { broadcastAiToPanel } from '@/lib/port';

function pathOf(url: string): string {
  try {
    return new URL(url).pathname || '/';
  } catch {
    return url;
  }
}

function accessibleName(meta: ElementMeta | undefined): string | null {
  if (!meta) return null;
  return (
    meta.ariaLabel ??
    meta.name ??
    meta.textContent ??
    meta.placeholder ??
    meta.altText ??
    meta.href ??
    meta.inputType ??
    meta.tag
  );
}

function reconstructDomContext(step: Step): DOMContext {
  const meta = step.elementMeta;
  return {
    page: { title: '', path: pathOf(step.url) },
    container: null,
    heading: null,
    siblings: [],
    target: {
      tag: meta?.tag ?? 'element',
      role: meta?.role ?? null,
      name: accessibleName(meta),
      value: step.inputValue ?? null,
      action: step.action,
    },
  };
}

export function getStepDomContext(step: Step): DOMContext {
  if (step.domContext) {
    try {
      const parsed = JSON.parse(step.domContext) as DOMContext;
      if (parsed?.target && typeof parsed.target.action === 'string') return parsed;
    } catch {
      logger.warn('Stored domContext for step failed to parse; falling back to reconstruction');
    }
  }
  return reconstructDomContext(step);
}

export async function handleGenerateStepDescriptions(
  guideId: string,
  stepIds?: string[],
): Promise<GenerateStepDescriptionsResponse> {
  const runtime = resolveAiRuntime(await localStorage.get([...AI_RUNTIME_SETTINGS]));
  if (!runtime) return { error: 'no-api-key' };

  const all = await getStepsForGuide(guideId);
  const actions = actionSteps(all);
  const targets = stepIds
    ? actions.filter((s) => stepIds.includes(s.id))
    : actions.filter((s) => (s.descriptionSource === 'heuristic' || !s.descriptionSource) && !s.aiPending);

  if (targets.length === 0) return { error: 'no-steps' };

  let updated = 0;
  for (const step of targets) {
    try {
      const description = await getAIDescription(
        getStepDomContext(step),
        runtime.selection,
        runtime.model,
        runtime.apiKey,
        runtime.baseUrl,
        runtime.headers,
      );
      if (!description) continue;
      await applyAiDescription(step.id, description);
      updated += 1;
    } catch (err) {
      const failure = describeAiFailure(err);
      logger.error(`AI step description failed (${failure.reason}${failure.status ? ` ${failure.status}` : ''})`, err);
      broadcastAiToPanel({
        type: 'AI_UPDATE',
        reason: failure.reason,
        status: failure.status,
        provider: runtime.selection,
        label: runtime.label,
      });
      break;
    }
  }

  return { updated };
}
