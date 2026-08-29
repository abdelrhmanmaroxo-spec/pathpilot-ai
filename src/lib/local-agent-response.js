import { generateBrowserLLMResponse, isBrowserLLMReady } from './local-llm.js';
import { superLocalResponse } from './local-super-reasoner.js';

function freshnessBoundary(answer, freshnessNeeded) {
  const text = String(answer || '').trim();
  if (!freshnessNeeded || !text) return text;
  const note = 'ملاحظة: الجزء اللي يعتمد على معلومات حالية أو متغيرة يحتاج تحقق حي قبل الاعتماد عليه.';
  return text.includes(note) ? text : `${text}\n\n${note}`;
}

export async function generateLocalAgentResponse({
  mode = 'general',
  tool = 'ask',
  prompt = '',
  preferences = {},
  signal,
  freshnessNeeded = false,
  allowColdStart = true,
} = {}) {
  if (signal?.aborted) throw signal.reason || new DOMException('The operation was aborted.', 'AbortError');

  if (preferences.localLlmEnabled && (allowColdStart || isBrowserLLMReady())) {
    try {
      const result = await generateBrowserLLMResponse({
        mode,
        tool,
        prompt,
        preferences,
        timeoutMs: allowColdStart ? 180_000 : 90_000,
      });
      if (signal?.aborted) throw signal.reason || new DOMException('The operation was aborted.', 'AbortError');
      if (result?.answer) {
        return {
          ...result,
          answer: freshnessBoundary(result.answer, freshnessNeeded),
          source: 'local-llm',
          degraded: false,
          route: 'local-agent',
        };
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      console.warn('PathPilot local model was unavailable; continuing with deterministic expert intelligence.', error);
    }
  }

  const answer = superLocalResponse({ mode, tool, prompt, preferences });
  return {
    answer: freshnessBoundary(answer, freshnessNeeded),
    source: 'local-reasoner',
    degraded: true,
    route: 'local-agent',
    sources: [],
    sourceCount: 0,
  };
}
