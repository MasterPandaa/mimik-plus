import { generateText } from 'ai';
import { localStorage } from '@/lib/browser-api';
import { logger } from '@/lib/logger';
import type { RewriteSelectionResponse } from '@/lib/messaging';
import { AI_RUNTIME_SETTINGS, resolveAiRuntime } from './custom-providers';
import { getLanguageSuffix, REWRITE_PROMPT } from './prompts';
import { createModel } from './provider';

const WRAPPED_IN_QUOTES = /^["“'](.*)["”']$/s;

export function cleanRewrite(raw: string): string {
  const trimmed = raw.trim();
  const unwrapped = trimmed.match(WRAPPED_IN_QUOTES);
  return (unwrapped ? unwrapped[1] : trimmed).trim();
}

export function buildRewritePrompt(text: string, instruction: string, locale: string): string {
  return (
    REWRITE_PROMPT.replace('{{text}}', () => text).replace('{{instruction}}', () => instruction) +
    getLanguageSuffix(locale)
  );
}

export async function rewriteSelection(text: string, instruction: string): Promise<RewriteSelectionResponse> {
  const settings = await localStorage.get([...AI_RUNTIME_SETTINGS, 'aiLanguage']);
  const runtime = resolveAiRuntime(settings);
  if (!runtime) return { error: 'no-api-key' };

  try {
    const { text: raw } = await generateText({
      model: createModel(runtime.selection, runtime.model, runtime.apiKey, runtime.baseUrl, runtime.headers),
      prompt: buildRewritePrompt(text, instruction, (settings.aiLanguage as string) || 'en'),
      maxOutputTokens: 400,
    });

    const cleaned = cleanRewrite(raw);
    if (!cleaned) return { error: 'generation-failed' };
    return { text: cleaned };
  } catch (err) {
    logger.error('Selection rewrite failed', err);
    return { error: 'generation-failed' };
  }
}
