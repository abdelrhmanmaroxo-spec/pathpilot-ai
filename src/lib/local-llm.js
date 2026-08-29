import { superLocalResponse } from './local-super-reasoner.js';

const WEBLLM_MODULE_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.84';
const DEFAULT_TIMEOUT_MS = 70_000;

let modulePromise = null;
let enginePromise = null;
let activeEngine = null;
let activeModelId = '';

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

function findModelId(ids, fragment) {
  return ids.find((id) => id === fragment) || ids.find((id) => id.toLowerCase().includes(fragment.toLowerCase()));
}

function selectModel(webllm) {
  const ids = modelIds(webllm);
  if (!ids.length) throw new Error('LOCAL_LLM_MODEL_LIST_EMPTY');

  const memory = Number(navigator.deviceMemory || 4);
  const preferred = memory >= 8
    ? [
        'Qwen3-1.7B-q4f16_1-MLC',
        'Qwen3.5-0.8B-q4f16_1-MLC',
        'Qwen3-0.6B-q4f16_1-MLC',
        'Llama-3.2-1B-Instruct-q4f16_1-MLC',
      ]
    : [
        'Qwen3.5-0.8B-q4f16_1-MLC',
        'Qwen3-0.6B-q4f16_1-MLC',
        'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        'Qwen3-1.7B-q4f16_1-MLC',
      ];

  for (const candidate of preferred) {
    const exact = findModelId(ids, candidate);
    if (exact) return exact;
  }

  const qwen = ids.find((id) => /qwen3(?:\.5)?-(?:0\.6|0\.8|1\.7)b.*q4f16/i.test(id));
  if (qwen) return qwen;
  const smallInstruct = ids.find((id) => /(0\.5b|0\.6b|0\.8b|1b|1\.5b|1\.7b).*instruct/i.test(id));
  if (smallInstruct) return smallInstruct;
  throw new Error('LOCAL_LLM_SMALL_MODEL_NOT_FOUND');
}

async function getEngine(onProgress) {
  if (activeEngine) return activeEngine;
  if (!enginePromise) {
    enginePromise = (async () => {
      if (!supportsBrowserLLM()) throw new Error('LOCAL_LLM_WEBGPU_UNAVAILABLE');
      const webllm = await loadWebLLM();
      const selectedModel = selectModel(webllm);
      const engine = await webllm.CreateMLCEngine(selectedModel, {
        initProgressCallback: (report) => onProgress?.({
          progress: Number(report?.progress || 0),
          text: String(report?.text || 'Loading local model…'),
        }),
        logLevel: 'WARN',
      });
      activeEngine = engine;
      activeModelId = selectedModel;
      return engine;
    })().catch((error) => {
      enginePromise = null;
      throw error;
    });
  }
  return enginePromise;
}

function systemPrompt() {
  return [
    'You are PathPilot Local AI, an on-device assistant.',
    'Answer primarily in Arabic unless the user clearly asks for another language.',
    'Use the supplied local knowledge as evidence and context, but do not copy it mechanically.',
    'Infer the real user intent, satisfy every explicit constraint, compare alternatives when relevant, and finish with practical next steps.',
    'Separate known information from assumptions and uncertainty.',
    'Do not claim current web knowledge, live prices, current releases, or recent news unless it is explicitly present in the supplied context.',
    'Never invent personal facts, credentials, metrics, sources, or citations.',
    'For uncertain claims, state the uncertainty briefly and suggest what would resolve it.',
    'Do not reveal hidden reasoning or chain-of-thought. Give conclusions and concise useful rationale only.',
  ].join(' ');
}

function userPrompt({ prompt, tool, mode, preferences, context }) {
  const style = preferences?.responseStyle || 'balanced';
  const audience = preferences?.audience || 'self';
  return `User request:\n${prompt}\n\nWorkspace: ${mode}\nTool: ${tool}\nAudience: ${audience}\nResponse style: ${style}\n\nLocal knowledge retrieved from PathPilot:\n${context.slice(0, 11_000)}\n\nTask: Produce one coherent final answer that directly satisfies the user. Use the local knowledge to improve correctness and depth. Do not describe the retrieval process or hidden reasoning.`;
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

  const context = superLocalResponse({ prompt, tool, mode, preferences: { ...preferences, responseStyle: 'detailed' } });
  const run = (async () => {
    const engine = await getEngine(onProgress);
    const response = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: userPrompt({ prompt, tool, mode, preferences, context }) },
      ],
      temperature: 0.25,
      top_p: 0.9,
      max_tokens: preferences.responseStyle === 'detailed' ? 1100 : preferences.responseStyle === 'concise' ? 450 : 750,
      extra_body: { enable_thinking: false },
    });
    const answer = response?.choices?.[0]?.message?.content?.replace(/<think>[\s\S]*?<\/think>\s*/gi, '').trim();
    if (!answer) throw new Error('LOCAL_LLM_EMPTY_RESPONSE');
    return {
      answer,
      model: activeModelId,
      source: 'local-llm',
      degraded: true,
    };
  })();

  return withTimeout(run, timeoutMs);
}

export function getBrowserLLMInfo() {
  return {
    supported: supportsBrowserLLM(),
    ready: isBrowserLLMReady(),
    model: activeModelId || null,
    runtime: 'WebLLM/WebGPU',
  };
}
