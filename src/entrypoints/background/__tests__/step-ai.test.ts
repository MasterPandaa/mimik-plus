import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  applyAiDescriptionMock,
  broadcastAiToPanelMock,
  getAIDescriptionMock,
  getStepsForGuideMock,
  localStorageGetMock,
} = vi.hoisted(() => ({
  applyAiDescriptionMock: vi.fn(),
  broadcastAiToPanelMock: vi.fn(),
  getAIDescriptionMock: vi.fn(),
  getStepsForGuideMock: vi.fn(),
  localStorageGetMock: vi.fn(),
}));

vi.mock('@/core/capture/ai/description', () => ({ getAIDescription: getAIDescriptionMock }));

vi.mock('@/core/guides/service', () => ({
  applyAiDescription: applyAiDescriptionMock,
  getStepsForGuide: getStepsForGuideMock,
}));

vi.mock('@/lib/browser-api', () => ({ localStorage: { get: localStorageGetMock } }));

vi.mock('@/lib/port', () => ({ broadcastAiToPanel: broadcastAiToPanelMock }));

import type { Step } from '@/core/guides/types';
import { getStepDomContext, handleGenerateStepDescriptions } from '../step-ai';

const GUIDE_ID = 'guide-1';

function step(overrides: Partial<Step>): Step {
  return {
    id: 's1',
    guideId: GUIDE_ID,
    index: 0,
    description: 'fallback',
    action: 'click',
    url: 'https://example.com/settings/profile',
    timestamp: 0,
    ...overrides,
  };
}

function validStoredContext() {
  return JSON.stringify({
    page: { title: 'Stored page', path: '/stored' },
    container: { tag: 'form', role: null, label: 'Stored form' },
    heading: 'Stored heading',
    siblings: [],
    target: { tag: 'button', role: null, name: 'Save', value: null, action: 'click' },
  });
}

describe('background step-ai getStepDomContext', () => {
  it('returns the stored context when it parses as a valid DOMContext', () => {
    const ctx = getStepDomContext(step({ domContext: validStoredContext() }));
    expect(ctx.page.title).toBe('Stored page');
    expect(ctx.container?.label).toBe('Stored form');
    expect(ctx.target.name).toBe('Save');
  });

  it('falls back to reconstruction when the stored context is corrupt', () => {
    const ctx = getStepDomContext(
      step({ domContext: 'not json', elementMeta: { tag: 'button' } as Step['elementMeta'] }),
    );
    expect(ctx.page.path).toBe('/settings/profile');
    expect(ctx.target.tag).toBe('button');
    expect(ctx.target.name).toBe('button');
  });

  it('reconstructs from elementMeta and inputValue when nothing is stored', () => {
    const ctx = getStepDomContext(
      step({
        action: 'input',
        elementMeta: {
          tag: 'input',
          cssSelector: '#email',
          textContent: null,
          ariaLabel: 'Email address',
          placeholder: null,
          altText: null,
          name: null,
          role: null,
          href: null,
          inputType: 'email',
          dataTestId: null,
          rect: { x: 0, y: 0, width: 0, height: 0 },
          devicePixelRatio: 1,
        },
        inputValue: 'john@example.com',
      }),
    );
    expect(ctx.target.tag).toBe('input');
    expect(ctx.target.name).toBe('Email address');
    expect(ctx.target.value).toBe('john@example.com');
    expect(ctx.target.action).toBe('input');
    expect(ctx.container).toBeNull();
    expect(ctx.siblings).toEqual([]);
  });

  it('uses ariaLabel before the text content when picking the accessible name', () => {
    const ctx = getStepDomContext(
      step({
        elementMeta: {
          tag: 'button',
          cssSelector: '#submit',
          textContent: 'Submit order',
          ariaLabel: 'Confirm order',
          placeholder: null,
          altText: null,
          name: null,
          role: null,
          href: null,
          inputType: null,
          dataTestId: null,
          rect: { x: 0, y: 0, width: 0, height: 0 },
          devicePixelRatio: 1,
        },
      }),
    );
    expect(ctx.target.name).toBe('Confirm order');
  });
});

describe('background step-ai handleGenerateStepDescriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageGetMock.mockResolvedValue({ aiApiKey: 'key', aiProvider: 'openai', aiModel: 'gpt-4o' });
    getStepsForGuideMock.mockResolvedValue([step({})]);
    getAIDescriptionMock.mockResolvedValue('Clicked the Save button');
    applyAiDescriptionMock.mockResolvedValue(true);
  });

  it('reports no-api-key without touching any step', async () => {
    localStorageGetMock.mockResolvedValue({});

    await expect(handleGenerateStepDescriptions(GUIDE_ID)).resolves.toEqual({ error: 'no-api-key' });
    expect(getAIDescriptionMock).not.toHaveBeenCalled();
    expect(applyAiDescriptionMock).not.toHaveBeenCalled();
  });

  it('reports no-steps when no step matches the requested ids', async () => {
    getStepsForGuideMock.mockResolvedValue([step({ id: 'a' })]);

    await expect(handleGenerateStepDescriptions(GUIDE_ID, ['missing'])).resolves.toEqual({ error: 'no-steps' });
    expect(getAIDescriptionMock).not.toHaveBeenCalled();
  });

  it('bulk fill targets only heuristic steps, skipping manual, narration, ai and pending', async () => {
    const heuristic = step({ id: 'heuristic' });
    getStepsForGuideMock.mockResolvedValue([
      heuristic,
      step({ id: 'manual', descriptionSource: 'manual' }),
      step({ id: 'narration', descriptionSource: 'narration' }),
      step({ id: 'ai', descriptionSource: 'ai' }),
      step({ id: 'pending', aiPending: true }),
      step({ id: 'block', blockType: 'callout', description: 'Note' }),
    ]);

    await expect(handleGenerateStepDescriptions(GUIDE_ID)).resolves.toEqual({ updated: 1 });
    expect(getAIDescriptionMock).toHaveBeenCalledTimes(1);
    expect(applyAiDescriptionMock).toHaveBeenCalledWith('heuristic', 'Clicked the Save button');
  });

  it('targets exactly the provided step ids when given', async () => {
    const a = step({ id: 'a' });
    const b = step({ id: 'b' });
    const c = step({ id: 'c' });
    getStepsForGuideMock.mockResolvedValue([a, b, c]);

    await expect(handleGenerateStepDescriptions(GUIDE_ID, ['b'])).resolves.toEqual({ updated: 1 });
    expect(getAIDescriptionMock).toHaveBeenCalledTimes(1);
    expect(applyAiDescriptionMock).toHaveBeenCalledWith('b', expect.stringContaining('Save'));
  });

  it('reports the generated count across multiple steps', async () => {
    getStepsForGuideMock.mockResolvedValue([step({ id: 'a' }), step({ id: 'b' })]);

    await expect(handleGenerateStepDescriptions(GUIDE_ID)).resolves.toEqual({ updated: 2 });
    expect(applyAiDescriptionMock).toHaveBeenCalledTimes(2);
  });

  it('counts nothing when the model returns empty output', async () => {
    getAIDescriptionMock.mockResolvedValue('');

    await expect(handleGenerateStepDescriptions(GUIDE_ID)).resolves.toEqual({ updated: 0 });
    expect(applyAiDescriptionMock).not.toHaveBeenCalled();
  });

  it('stops on a failing call and reports the partial count', async () => {
    getStepsForGuideMock.mockResolvedValue([step({ id: 'a' }), step({ id: 'b' }), step({ id: 'c' })]);
    getAIDescriptionMock.mockResolvedValueOnce('First success').mockRejectedValueOnce(new Error('boom'));

    await expect(handleGenerateStepDescriptions(GUIDE_ID)).resolves.toEqual({ updated: 1 });
    expect(applyAiDescriptionMock).toHaveBeenCalledTimes(1);
    expect(applyAiDescriptionMock).toHaveBeenCalledWith('a', 'First success');
    expect(getAIDescriptionMock).toHaveBeenCalledTimes(2);
    expect(broadcastAiToPanelMock).toHaveBeenCalled();
  });
});
