import { createApiClient } from './api-client.js';
import { answerCache } from './answer-cache.js';
import { generateAssistantResponse } from './assistant.js';
import { routeAssistantRequest } from './smart-router.js';

const platformBase = String(import.meta.env?.VITE_PLATFORM_API_URL || '').trim();
const researchAvailable = Boolean(String(import.meta.env?.VITE_AI_API_URL || '').trim());
const directAvailable = Boolean(platformBase);
const directClient = directAvailable
  ? createApiClient({ baseUrl: platformBase, timeoutMs: 65_000, sendClientRequestId: true })
  : null;

function normalizedResult(payload, route) {
  if (typeof payload?.answer !== 'string' || !payload.answer.trim()) throw new Error('Invalid AI response');
  return {
    answer: payload.answer.trim(),
    source: payload.sourceMode || 'live',
    degraded: Boolean(payload.researchFailed),
    sources: Array.isArray(payload.sources) ? payload.sources : [],
    sourceCount: Number(payload.sourceCount || 0),
    targetReached: Boolean(payload.targetReached),
    route,
  };
}

export async function generateRoutedAssistantResponse(args) {
  const decision = routeAssistantRequest({
    prompt: args.prompt,
    tool: args.tool,
    hasResearch: researchAvailable,
    hasDirectAI: directAvailable,
  });

  if (decision.route === 'direct-ai' && directClient) {
    const cached = answerCache.find({
      mode: args.mode,
      tool: args.tool,
      prompt: args.prompt,
      preferences: args.preferences,
    });
    if (cached) return cached;

    try {
      const payload = await directClient.request('/api/assistant', {
        method: 'POST',
        body: JSON.stringify({
          mode: args.mode,
          tool: args.tool,
          prompt: args.prompt,
          preferences: args.preferences || {},
        }),
        signal: args.signal,
        timeoutMs: 65_000,
      });
      const result = normalizedResult(payload, 'direct-ai');
      answerCache.store({
        mode: args.mode,
        tool: args.tool,
        prompt: args.prompt,
        preferences: args.preferences,
        result,
      });
      return result;
    } catch (error) {
      if (args.signal?.aborted || error?.code === 'REQUEST_ABORTED') throw error;
      console.warn('PathPilot direct route failed; falling back to grounded route.', error);
    }
  }

  const result = await generateAssistantResponse(args);
  return {
    ...result,
    route: decision.route === 'research' ? 'research' : result.route || 'fallback',
  };
}
