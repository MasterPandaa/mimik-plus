import { AI_RUNTIME_SETTINGS, resolveAiRuntime } from '@/core/capture/ai/custom-providers';
import { getAIDescription } from '@/core/capture/ai/description';
import { describeAiFailure } from '@/core/capture/ai/errors';
import type { DOMContext } from '@/core/capture/dom/context';
import { localStorage } from '@/lib/browser-api';
import { logger } from '@/lib/logger';
import { broadcastAiToPanel } from '@/lib/port';

export async function generateAiDescription(domContext: DOMContext): Promise<string | undefined> {
  const runtime = resolveAiRuntime(await localStorage.get([...AI_RUNTIME_SETTINGS]));
  if (!runtime) return undefined;

  try {
    const description = await getAIDescription(
      domContext,
      runtime.selection,
      runtime.model,
      runtime.apiKey,
      runtime.baseUrl,
      runtime.headers,
    );
    return description || undefined;
  } catch (err) {
    const failure = describeAiFailure(err);
    logger.error(`AI description failed (${failure.reason}${failure.status ? ` ${failure.status}` : ''})`, err);
    broadcastAiToPanel({
      type: 'AI_UPDATE',
      reason: failure.reason,
      status: failure.status,
      provider: runtime.selection,
      label: runtime.label,
    });
    return undefined;
  }
}
