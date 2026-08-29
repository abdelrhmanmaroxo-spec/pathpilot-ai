import { createApiClient, PathPilotApiError } from './api-client.js';
import { answerCache } from './answer-cache.js';
import { generateAssistantResponse } from './assistant.js';
import { agentPlanGuidance, planChatAgent, publicAgentToolSummary } from './chat-agent-orchestrator.js';
import { hasExploitLikePayload } from './input-security.js';
import { routeAssistantRequest } from './smart-router.js';

const platformBase = String(import.meta.env?.VITE_PLATFORM_API_URL || '').trim();
const researchAvailable = Boolean(String(import.meta.env?.VITE_AI_API_URL || '').trim());
const directAvailable = Boolean(platformBase);
const directClient = directAvailable
  ? createApiClient({ baseUrl: platformBase, timeoutMs: 65_000, sendClientRequestId: true })
  : null;

let systemStatusCache = { checkedAt: 0, value: null };

async function assertSystemAvailable(signal) {
  if (!directClient) return;
  const now = Date.now();
  if (!systemStatusCache.value || now - systemStatusCache.checkedAt > 5_000) {
    try {
      const value = await directClient.request('/api/system/status', { signal, timeoutMs: 8_000 });
      systemStatusCache = { checkedAt: now, value };
    } catch (error) {
      if (error?.code === 'REQUEST_ABORTED') throw error;
      return;
    }
  }
  if (systemStatusCache.value?.paused) {
    throw new PathPilotApiError(
      systemStatusCache.value.reason || 'PathPilot is temporarily paused by administration.',
      { code: 'SYSTEM_PAUSED', status: 503, details: systemStatusCache.value },
    );
  }
}

function latestRequestFromContext(prompt) {
  const value = String(prompt || '').trim();
  if (!value.startsWith('LATEST USER REQUEST\n')) return value;
  const start = 'LATEST USER REQUEST\n'.length;
  const end = value.indexOf('\n\nCONVERSATION CONTEXT ANALYSIS', start);
  if (end < 0) return value;
  const latest = value.slice(start, end).trim();
  return latest || value;
}

function assertSafePrompt(prompt) {
  if (!hasExploitLikePayload(prompt)) return;
  throw new PathPilotApiError(
    'PathPilot Security blocked executable or exploit-like input. Remove active payload markup and describe the code conceptually instead.',
    { code: 'UNSAFE_INPUT_BLOCKED', status: 400 },
  );
}

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

function compactAgentPlan(plan) {
  return {
    version: plan.version,
    mode: plan.mode,
    intent: plan.intent,
    domain: plan.domain,
    risk: plan.risk,
    freshnessNeeded: plan.freshnessNeeded,
    allowResearch: plan.allowResearch,
    deepReview: plan.deepReview,
    toolIds: plan.toolIds,
  };
}

function withAgentMetadata(result, plan) {
  return {
    ...result,
    agentPlan: compactAgentPlan(plan),
    agentTools: publicAgentToolSummary(plan),
  };
}

export async function generateRoutedAssistantResponse(args) {
  const contextualPrompt = String(args.prompt || '').trim();
  const latestPrompt = latestRequestFromContext(contextualPrompt);
  const plan = planChatAgent({
    prompt: latestPrompt,
    forceResearch: args.routeOptions?.forceResearch === true,
    deepThink: args.routeOptions?.deepThink === true,
    voiceInput: args.routeOptions?.voiceInput === true,
    disabledToolIds: args.routeOptions?.disabledToolIds || [],
  });
  const deepThink = plan.deepReview;
  const effectivePreferences = {
    ...(args.preferences || {}),
    responseStyle: deepThink ? 'detailed' : (args.preferences?.responseStyle || 'balanced'),
    deepThinkEnabled: deepThink,
    agentPlan: compactAgentPlan(plan),
    agentGuidance: agentPlanGuidance(plan),
  };
  assertSafePrompt(latestPrompt);
  await assertSystemAvailable(args.signal);

  const decision = routeAssistantRequest({
    prompt: latestPrompt,
    tool: args.tool,
    hasResearch: researchAvailable && plan.allowResearch,
    hasDirectAI: directAvailable,
    forceResearch: plan.forceResearch,
  });

  if (decision.route === 'direct-ai' && directClient) {
    const cached = answerCache.find({
      mode: args.mode,
      tool: args.tool,
      prompt: contextualPrompt,
      preferences: effectivePreferences,
    });
    if (cached) return withAgentMetadata(cached, plan);

    try {
      const payload = await directClient.request('/api/assistant', {
        method: 'POST',
        body: JSON.stringify({
          mode: args.mode,
          tool: args.tool,
          prompt: contextualPrompt,
          preferences: effectivePreferences,
        }),
        signal: args.signal,
        timeoutMs: deepThink ? 85_000 : 65_000,
      });
      const result = normalizedResult(payload, 'direct-ai');
      answerCache.store({
        mode: args.mode,
        tool: args.tool,
        prompt: contextualPrompt,
        preferences: effectivePreferences,
        result,
      });
      return withAgentMetadata(result, plan);
    } catch (error) {
      if (args.signal?.aborted || error?.code === 'REQUEST_ABORTED' || error?.code === 'SYSTEM_PAUSED' || error?.code === 'UNSAFE_INPUT_BLOCKED') throw error;
      console.warn('PathPilot direct route failed; falling back to the next allowed agent tier.', error);
    }
  }

  const result = await generateAssistantResponse({
    ...args,
    prompt: contextualPrompt,
    latestPrompt,
    preferences: effectivePreferences,
    allowLiveAI: plan.allowResearch,
  });
  return withAgentMetadata({
    ...result,
    route: decision.route === 'research' ? 'research' : result.route || 'fallback',
  }, plan);
}
