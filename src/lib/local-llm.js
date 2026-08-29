import { chooseBetterLocalAnswer } from './local-answer-quality.js';
import { computeLocalConfidence, shouldRunLocalReview } from './local-confidence.js';
import {
  localDeviceProfile,
  localModelCandidates,
  localModelLoadCandidates,
  localModelScale,
  selectLocalModelId,
} from './local-llm/model-policy.js';
import {
  buildLocalReviewPrompt,
  buildLocalSystemPrompt,
  buildLocalUserPrompt,
  isComplexLocalRequest,
  localContextCharsFor,
  localMaxTokensFor,
} from './local-llm/prompt-policy.js';

export { localDeviceProfile, localModelCandidates, selectLocalModelId };

const WEBLLM_MODULE_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.84';
const DEFAULT_TIMEOUT_MS = 120_000;

let modulePromise = null;
let enginePromise = null;
let activeEngine = null;
let activeModelId = '';
let activeProfile = '';
let lastKnowledgeInfo = null;
let lastConfidenceInfo = null;
let lastQualityInfo = null;
let lastModelAttempts = [];

export function supportsBrowserLLM() {
  return typeof navigator !== 'undefined' && Boolean(navigator.gpu);
}

export function isBrowserLLMReady() {
  return Boolean(activeEngine && activeModelId);
}

async function loadWebLLM() {
  if (!modulePromise) modulePromise = import(/* @vite-ignore */ WEBLLM_MODULE_URL);
  return modulePromise;
}

function modelIds(webllm) {
  return (webllm.prebuiltAppConfig?.model_list || []).map((item) => item.model_id).filter(Boolean);
}

async function createEngineWithFallback(webllm, ids, onProgress) {
  const profile = localDeviceProfile();
  const candidates = localModelLoadCandidates(ids);
  activeProfile = profile;
  lastModelAttempts = [];
  let lastError = null;

  for (const [index, selectedModel] of candidates.entries()) {
    const attempt = index + 1;
    onProgress?.({
      phase: index === 0 ? 'model' : 'model-fallback',
      progress: Math.min(0.72, 0.05 + index * 0.08),
      text: index === 0 ? 'Loading the best local model for this device…' : 'Trying a lighter local model for compatibility…',
    });
    try {
      const engine = await webllm.CreateMLCEngine(selectedModel, {
        initProgressCallback: (report) => onProgress?.({
          phase: 'model',
          progress: Math.max(0.03, Number(report?.progress || 0)),
          text: String(report?.text || 'Loading local model…'),
        }),
        logLevel: 'WARN',
      });
      lastModelAttempts.push({ model: selectedModel, attempt, status: 'ready' });
      activeEngine = engine;
      activeModelId = selectedModel;
      return engine;
    } catch (error) {
      lastError = error;
      lastModelAttempts.push({ model: selectedModel, attempt, status: 'failed' });
      console.warn(`PathPilot local model attempt ${attempt} failed; trying a compatible fallback.`, error);
    }
  }

  throw lastError || new Error('LOCAL_LLM_MODEL_LOAD_FAILED');
}

async function getEngine(onProgress) {
  if (activeEngine) return activeEngine;
  if (!enginePromise) {
    enginePromise = (async () => {
      if (!supportsBrowserLLM()) throw new Error('LOCAL_LLM_WEBGPU_UNAVAILABLE');
      onProgress?.({ phase: 'runtime', progress: 0.02, text: 'Preparing on-device AI runtime…' });
      const webllm = await loadWebLLM();
      return createEngineWithFallback(webllm, modelIds(webllm), onProgress);
    })().catch((error) => {
      enginePromise = null;
      activeProfile = '';
      activeEngine = null;
      activeModelId = '';
      throw error;
    });
  }
  return enginePromise;
}

async function buildKnowledge(args, profile, onProgress) {
  onProgress?.({ phase: 'knowledge', progress: 0.06, text: 'Retrieving expert local knowledge…' });
  const module = await import('./local-knowledge-augment.js');
  const knowledge = module.buildExpertKnowledgeContext({
    ...args,
    maxChars: localContextCharsFor(args.preferences?.responseStyle || 'balanced', profile),
  });
  lastKnowledgeInfo = {
    version: knowledge.version,
    domains: knowledge.domains,
    stats: knowledge.stats,
    intent: knowledge.intent,
    constraints: knowledge.constraints,
  };
  onProgress?.({ phase: 'knowledge', progress: 0.1, text: `Selected ${knowledge.domains.length} expert domains.` });
  return knowledge;
}

function stripHiddenReasoning(value) {
  return String(value || '')
    .replace(/<think>[\s\S]*?<\/think>\s*/gi, '')
    .replace(/<analysis>[\s\S]*?<\/analysis>\s*/gi, '')
    .trim();
}

async function complete(engine, { messages, temperature, maxTokens }) {
  const response = await engine.chat.completions.create({
    messages,
    temperature,
    top_p: 0.9,
    max_tokens: maxTokens,
    extra_body: { enable_thinking: false },
  });
  const answer = stripHiddenReasoning(response?.choices?.[0]?.message?.content);
  if (!answer) throw new Error('LOCAL_LLM_EMPTY_RESPONSE');
  return answer;
}

function withTimeout(promise, timeoutMs) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('LOCAL_LLM_TIMEOUT')), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

export async function generateBrowserLLMResponse({ prompt, tool = 'ask', mode = 'general', preferences = {}, onProgress, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  if (!preferences.localLlmEnabled || !supportsBrowserLLM()) return null;

  const wasReady = isBrowserLLMReady();
  const run = (async () => {
    const profile = localDeviceProfile();
    const knowledge = await buildKnowledge({ prompt, tool, mode, preferences }, profile, onProgress);
    const engine = await getEngine(onProgress);
    const style = preferences.responseStyle || 'balanced';
    const system = buildLocalSystemPrompt({ mode, tool, preferences });
    const scaleB = localModelScale(activeModelId);

    const preliminaryConfidence = computeLocalConfidence({
      knowledge,
      profile,
      modelScaleB: scaleB,
      reviewed: false,
      prompt,
      tool,
    });

    onProgress?.({ phase: 'draft', progress: 0.88, text: 'Building the local expert answer…' });
    const draft = await complete(engine, {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: buildLocalUserPrompt({ prompt, tool, mode, preferences, knowledge }) },
      ],
      temperature: preliminaryConfidence.level === 'low' ? 0.14 : 0.22,
      maxTokens: localMaxTokensFor(style, profile),
    });

    let reviewCandidate = '';
    let reviewAttempted = false;
    const isComplex = isComplexLocalRequest({ prompt, tool, preferences, profile, modelScaleB: scaleB });
    const canReview = profile !== 'lite' && scaleB >= 1.4;
    const needsReview = canReview && shouldRunLocalReview({ confidence: preliminaryConfidence, isComplex });

    if (needsReview) {
      onProgress?.({ phase: 'review', progress: 0.96, text: 'Reviewing constraints, contradictions, and failure modes…' });
      try {
        reviewAttempted = true;
        reviewCandidate = await complete(engine, {
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: buildLocalReviewPrompt({ originalPrompt: prompt, draft, knowledge, style, preliminaryConfidence }) },
          ],
          temperature: 0.1,
          maxTokens: Math.min(localMaxTokensFor(style, profile) + 300, 2450),
        });
      } catch (error) {
        console.warn('PathPilot local critic pass skipped; using validated draft.', error);
        reviewCandidate = '';
      }
    }

    const quality = chooseBetterLocalAnswer({
      draft,
      reviewed: reviewCandidate,
      prompt,
      knowledge,
      style,
    });
    const answer = quality.answer;
    const reviewed = quality.selected === 'reviewed';
    lastQualityInfo = {
      selected: quality.selected,
      draftScore: quality.draftQuality.score,
      reviewedScore: quality.reviewedQuality.score,
      flags: reviewed ? quality.reviewedQuality.flags : quality.draftQuality.flags,
    };

    const confidence = computeLocalConfidence({
      knowledge,
      profile,
      modelScaleB: scaleB,
      reviewed,
      prompt,
      tool,
    });
    lastConfidenceInfo = confidence;
    lastKnowledgeInfo = { ...lastKnowledgeInfo, confidence, quality: lastQualityInfo };

    onProgress?.({ phase: 'done', progress: 1, text: 'Local expert answer ready.' });
    return {
      answer,
      model: activeModelId,
      source: 'local-llm',
      degraded: true,
      profile: activeProfile || profile,
      knowledgeVersion: knowledge.version,
      knowledgeDomains: knowledge.domains,
      knowledgeStats: knowledge.stats,
      reviewAttempted,
      reviewed,
      confidence,
      quality: lastQualityInfo,
    };
  })();

  const minimumTimeout = wasReady ? 90_000 : 180_000;
  return withTimeout(run, Math.max(Number(timeoutMs || 0), minimumTimeout));
}

export function getBrowserLLMInfo() {
  return {
    supported: supportsBrowserLLM(),
    ready: isBrowserLLMReady(),
    model: activeModelId || null,
    modelScaleB: activeModelId ? localModelScale(activeModelId) : null,
    profile: activeProfile || localDeviceProfile(),
    runtime: 'WebLLM/WebGPU',
    adaptiveModelFallback: true,
    modelAttempts: lastModelAttempts,
    expertRag: true,
    selfReview: true,
    confidenceAwareReview: true,
    answerQualityGate: true,
    confidence: lastConfidenceInfo,
    quality: lastQualityInfo,
    knowledge: lastKnowledgeInfo,
  };
}
