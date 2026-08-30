import { createApiClient, PathPilotApiError } from './api-client.js';
import { answerCache } from './answer-cache.js';
import { generateAssistantResponse } from './assistant.js';
import { agentPlanGuidance, planChatAgent, publicAgentActivity, publicAgentToolSummary } from './chat-agent-orchestrator.js';
import { hasExploitLikePayload } from './input-security.js';
import { generateLocalAgentResponse } from './local-agent-response.js';
import { localConversationalReply } from './local-conversation.js';
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
    matchedTask: plan.matchedTask,
    alternativeTasks: plan.alternativeTasks,
    complexity: plan.complexity,
    stages: plan.stages,
    domain: plan.domain,
    risk: plan.risk,
    freshnessNeeded: plan.freshnessNeeded,
    allowResearch: plan.allowResearch,
    deepReview: plan.deepReview,
    toolIds: plan.toolIds,
  };
}

function withAgentMetadata(result, plan) {
  if (plan?.mode !== 'auto') return result;
  return {
    ...result,
    agentPlan: compactAgentPlan(plan),
    agentTools: publicAgentToolSummary(plan),
  };
}

function legacyPlan(routeOptions = {}) {
  return {
    version: 'legacy',
    mode: 'legacy',
    intent: '',
    domain: '',
    risk: 'normal',
    freshnessNeeded: false,
    allowResearch: true,
    forceResearch: routeOptions.forceResearch === true,
    deepReview: routeOptions.deepThink === true,
    disabledToolIds: [],
    toolIds: [],
    tools: [],
  };
}

function conversationalFastPath(prompt, enabled) {
  if (!enabled) return null;
  const answer = localConversationalReply(prompt);
  if (!answer) return null;
  return {
    answer,
    source: 'local-conversation',
    degraded: false,
    route: 'local-agent',
    sources: [],
    sourceCount: 0,
  };
}

function buildRoutingContext(args) {
  const contextualPrompt = String(args.prompt || '').trim();
  const latestPrompt = latestRequestFromContext(contextualPrompt);
  const agentEnabled = args.routeOptions?.agentMode === 'auto' || args.routeOptions?.preferLocalModel === true;
  const plan = agentEnabled
    ? planChatAgent({
      prompt: latestPrompt,
      forceResearch: args.routeOptions?.forceResearch === true,
      deepThink: args.routeOptions?.deepThink === true,
      voiceInput: args.routeOptions?.voiceInput === true,
      disabledToolIds: args.routeOptions?.disabledToolIds || [],
    })
    : legacyPlan(args.routeOptions);
  const deepThink = plan.deepReview;
  const effectivePreferences = {
    ...(args.preferences || {}),
    responseStyle: deepThink ? 'detailed' : (args.preferences?.responseStyle || 'balanced'),
    deepThinkEnabled: deepThink,
    ...(agentEnabled ? {
      agentPlan: compactAgentPlan(plan),
      agentGuidance: agentPlanGuidance(plan),
    } : {}),
  };
  return { contextualPrompt, latestPrompt, agentEnabled, plan, deepThink, effectivePreferences };
}

function routingDecision(args, latestPrompt, plan) {
  return routeAssistantRequest({
    prompt: latestPrompt,
    tool: args.tool,
    hasResearch: researchAvailable && plan.allowResearch,
    hasDirectAI: directAvailable,
    forceResearch: plan.forceResearch,
  });
}

function cacheLookup(args, contextualPrompt, effectivePreferences) {
  return answerCache.find({
    mode: args.mode,
    tool: args.tool,
    prompt: contextualPrompt,
    preferences: effectivePreferences,
  });
}

function cacheStore(args, contextualPrompt, effectivePreferences, result) {
  answerCache.store({
    mode: args.mode,
    tool: args.tool,
    prompt: contextualPrompt,
    preferences: effectivePreferences,
    result,
  });
}

function shouldRethrow(error, signal) {
  return Boolean(
    signal?.aborted
    || error?.code === 'REQUEST_ABORTED'
    || error?.code === 'SYSTEM_PAUSED'
    || error?.code === 'UNSAFE_INPUT_BLOCKED',
  );
}

async function tryPreferredLocalAgent({ args, contextualPrompt, effectivePreferences, plan }) {
  if (plan?.mode !== 'auto' || !args.routeOptions?.preferLocalModel || !effectivePreferences.localLlmEnabled || plan.freshnessNeeded) return null;
  const local = await generateLocalAgentResponse({
    mode: args.mode,
    tool: args.tool,
    prompt: contextualPrompt,
    preferences: effectivePreferences,
    signal: args.signal,
    onProgress: args.onProgress,
    onDelta: args.onDelta,
    freshnessNeeded: false,
    allowColdStart: true,
  });
  return local?.source === 'local-llm' ? local : null;
}

export async function generateRoutedAssistantResponse(args) {
  const runtime = buildRoutingContext(args);
  const { contextualPrompt, latestPrompt, agentEnabled, plan, deepThink, effectivePreferences } = runtime;

  assertSafePrompt(latestPrompt);
  const conversational = conversationalFastPath(latestPrompt, agentEnabled);
  if (conversational) return withAgentMetadata(conversational, plan);

  await assertSystemAvailable(args.signal);

  const preferredLocal = await tryPreferredLocalAgent({ args, contextualPrompt, effectivePreferences, plan });
  if (preferredLocal) return withAgentMetadata(preferredLocal, plan);

  const decision = routingDecision(args, latestPrompt, plan);

  if (decision.route === 'direct-ai' && directClient) {
    const cached = cacheLookup(args, contextualPrompt, effectivePreferences);
    if (cached) return withAgentMetadata(cached, plan);

    try {
      const payload = await directClient.request('/api/assistant', {
        method: 'POST',
        json: {
          mode: args.mode,
          tool: args.tool,
          prompt: contextualPrompt,
          preferences: effectivePreferences,
        },
        signal: args.signal,
        timeoutMs: deepThink ? 85_000 : 65_000,
      });
      const result = normalizedResult(payload, 'direct-ai');
      cacheStore(args, contextualPrompt, effectivePreferences, result);
      return withAgentMetadata(result, plan);
    } catch (error) {
      if (shouldRethrow(error, args.signal)) throw error;
      console.warn(agentEnabled
        ? 'PathPilot direct route failed; falling back to the next allowed agent tier.'
        : 'PathPilot direct route failed; falling back to grounded route.', error);
    }
  }

  if (agentEnabled && decision.route !== 'research') {
    const local = await generateLocalAgentResponse({
      mode: args.mode,
      tool: args.tool,
      prompt: contextualPrompt,
      preferences: effectivePreferences,
      signal: args.signal,
      onProgress: args.onProgress,
      onDelta: args.onDelta,
      freshnessNeeded: plan.freshnessNeeded,
      allowColdStart: true,
    });
    return withAgentMetadata(local, plan);
  }

  const result = await generateAssistantResponse({
    ...args,
    prompt: contextualPrompt,
    latestPrompt,
    preferences: effectivePreferences,
  });
  const routed = {
    ...result,
    route: decision.route === 'research' ? 'research' : result.route || 'fallback',
  };
  return withAgentMetadata(routed, plan);
}

function activityReporter(plan, onActivity, language) {
  const steps = publicAgentActivity(plan, language);
  let activeIndex = 0;
  const emit = (stepId, detail = '') => {
    const found = steps.findIndex((step) => step.id === stepId);
    if (found >= 0) activeIndex = Math.max(activeIndex, found);
    onActivity?.({ steps, activeIndex, activeStep: steps[activeIndex], detail });
  };
  return { emit };
}

function localProgressStep(phase) {
  if (phase === 'knowledge') return 'knowledge';
  if (phase === 'draft') return 'reason';
  if (phase === 'review') return 'review';
  if (phase === 'done') return 'stream';
  return 'match';
}

export async function streamRoutedAssistantResponse(args, { onDelta, onActivity, language = 'ar' } = {}) {
  const runtime = buildRoutingContext(args);
  const { contextualPrompt, latestPrompt, agentEnabled, plan, deepThink, effectivePreferences } = runtime;
  const activity = activityReporter(plan, onActivity, language);
  activity.emit('understand');

  assertSafePrompt(latestPrompt);
  const conversational = conversationalFastPath(latestPrompt, agentEnabled);
  if (conversational) {
    activity.emit('stream');
    onDelta?.(conversational.answer, conversational.answer);
    return withAgentMetadata(conversational, plan);
  }

  await assertSystemAvailable(args.signal);
  const decision = routingDecision(args, latestPrompt, plan);
  activity.emit(decision.route === 'research' ? 'research' : 'match');

  if (decision.route !== 'direct-ai' || !directClient) {
    let emitted = false;
    const result = await generateRoutedAssistantResponse({
      ...args,
      onProgress: (progress) => activity.emit(localProgressStep(progress?.phase), progress?.text || ''),
      onDelta: (delta, fullAnswer) => {
        emitted = true;
        activity.emit('stream');
        onDelta?.(delta, fullAnswer);
      },
    });
    if (!emitted) {
      activity.emit('stream');
      onDelta?.(result.answer, result.answer);
    }
    return result;
  }

  const cached = cacheLookup(args, contextualPrompt, effectivePreferences);
  if (cached) {
    activity.emit('stream');
    onDelta?.(cached.answer, cached.answer);
    return withAgentMetadata(cached, plan);
  }

  let answer = '';
  let emitted = false;
  let doneMetadata = null;

  try {
    for await (const event of directClient.streamEvents('/api/assistant/stream', {
      method: 'POST',
      json: {
        mode: args.mode,
        tool: args.tool,
        prompt: contextualPrompt,
        preferences: effectivePreferences,
      },
      signal: args.signal,
      timeoutMs: deepThink ? 110_000 : 90_000,
    })) {
      if (event.event === 'delta') {
        const delta = typeof event.data?.text === 'string' ? event.data.text : '';
        if (!delta) continue;
        emitted = true;
        answer += delta;
        activity.emit('stream');
        onDelta?.(delta, answer);
        continue;
      }
      if (event.event === 'done') {
        doneMetadata = event.data && typeof event.data === 'object' ? event.data : null;
        continue;
      }
      if (event.event === 'error') {
        throw new PathPilotApiError(event.data?.error || 'The streamed response failed.', {
          code: event.data?.code || 'STREAM_FAILED',
          requestId: event.requestId,
          details: event.data,
        });
      }
    }

    if (!answer.trim()) {
      throw new PathPilotApiError('The AI provider returned an empty stream.', { code: 'EMPTY_STREAM_RESPONSE' });
    }

    const result = {
      answer: answer.trim(),
      source: 'live',
      degraded: false,
      sources: [],
      sourceCount: 0,
      targetReached: true,
      route: doneMetadata?.route || 'direct-ai-stream',
      streamed: true,
      latencyMs: Number(doneMetadata?.latencyMs || 0),
    };
    cacheStore(args, contextualPrompt, effectivePreferences, result);
    return withAgentMetadata(result, plan);
  } catch (error) {
    if (shouldRethrow(error, args.signal) || emitted) throw error;
    console.warn('PathPilot live stream could not start; falling back to the existing answer pipeline.', error);
    let fallbackEmitted = false;
    const fallback = await generateRoutedAssistantResponse({
      ...args,
      onProgress: (progress) => activity.emit(localProgressStep(progress?.phase), progress?.text || ''),
      onDelta: (delta, fullAnswer) => {
        fallbackEmitted = true;
        activity.emit('stream');
        onDelta?.(delta, fullAnswer);
      },
    });
    if (!fallbackEmitted) {
      activity.emit('stream');
      onDelta?.(fallback.answer, fallback.answer);
    }
    return fallback;
  }
}
