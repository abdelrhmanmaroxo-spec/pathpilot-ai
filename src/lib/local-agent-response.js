import { localConversationalReply } from './local-conversation.js';
import { generateBrowserLLMResponse, isBrowserLLMReady } from './local-llm.js';
import { mergeMaterials, summarizeMaterials } from './material-intelligence.js';
import { naturalLocalResponse } from './natural-local-response.js';
import { superLocalResponse } from './local-super-reasoner.js';

function freshnessBoundary(answer, freshnessNeeded) {
  const text = String(answer || '').trim();
  if (!freshnessNeeded || !text) return text;
  const note = 'ملاحظة: الجزء اللي يعتمد على معلومات حالية أو متغيرة يحتاج تحقق حي قبل الاعتماد عليه.';
  return text.includes(note) ? text : `${text}\n\n${note}`;
}

function extractLatestUserSection(prompt) {
  const value = String(prompt || '').trim();
  if (!value.startsWith('LATEST USER REQUEST\n')) return value;
  const start = 'LATEST USER REQUEST\n'.length;
  const end = value.indexOf('\n\nCONVERSATION CONTEXT ANALYSIS', start);
  return (end >= 0 ? value.slice(start, end) : value.slice(start)).trim() || value;
}

function extractMaterialBlocksFromPrompt(prompt) {
  const latest = extractLatestUserSection(prompt);
  const blockPattern = /===\s*\[(\d+)\]\s*([^\n=]+?)\s*===\n([\s\S]*?)(?=\n===\s*\[\d+\]|$)/g;
  const extracted = [];
  let match;
  while ((match = blockPattern.exec(latest)) !== null) {
    const title = match[2].replace(/\(\d+\s*words\)/i, '').trim();
    const content = match[3].trim();
    if (content) extracted.push({ id: `block-${match[1]}`, title, content });
  }
  if (extracted.length >= 1) return { materials: extracted, raw: latest };

  const separatorParts = latest
    .split(/\n\s*(?:---+|\*\*\*+|===+)\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 40);
  if (separatorParts.length >= 2 && /(?:ادمج|دمج|لخص|تلخيص|قارن|اربط|merge|synthesize|summarize)/i.test(latest)) {
    return {
      materials: separatorParts.map((content, idx) => ({ id: `sep-${idx + 1}`, title: `المادة ${idx + 1}`, content })),
      raw: latest,
    };
  }
  return null;
}

function localMaterialSynthesisReply(prompt, tool, preferences = {}) {
  const latest = extractLatestUserSection(prompt);
  const language = /[A-Za-z]/.test(latest) && !/[\u0600-\u06FF]/.test(latest) ? 'en' : 'ar';
  const parsedEnvelope = extractMaterialBlocksFromPrompt(prompt);

  if (parsedEnvelope?.materials?.length) {
    const wantsMerge = parsedEnvelope.materials.length >= 2 && /(?:ادمج|دمج|موحد|اربط|merge|synthesize|cross-link)/i.test(latest);
    if (wantsMerge) {
      return mergeMaterials(parsedEnvelope.materials, { language });
    }
    return summarizeMaterials(parsedEnvelope.materials, {
      depth: preferences.deepThinkEnabled || preferences.responseStyle === 'detailed' ? 'detailed' : 'balanced',
      language,
    });
  }

  if ((tool === 'summarize' || /(?:لخص|لخّص|اختصر|ملخص\s+لـ?|summarize\s+this)/i.test(latest)) && latest.length >= 160) {
    return summarizeMaterials([{ id: 'single-1', title: language === 'en' ? 'Provided Material' : 'النص المرفق', content: latest }], {
      depth: preferences.deepThinkEnabled ? 'detailed' : 'balanced',
      language,
    });
  }

  return '';
}

export async function generateLocalAgentResponse({
  mode = 'general',
  tool = 'ask',
  prompt = '',
  preferences = {},
  signal,
  onDelta,
  onProgress,
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
        signal,
        onDelta,
        onProgress,
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

  const conversational = localConversationalReply(prompt);
  if (conversational) {
    return {
      answer: conversational,
      source: 'local-conversation',
      degraded: false,
      route: 'local-agent',
      sources: [],
      sourceCount: 0,
    };
  }

  const materialSynthesis = localMaterialSynthesisReply(prompt, tool, preferences);
  if (materialSynthesis) {
    return {
      answer: freshnessBoundary(materialSynthesis, freshnessNeeded),
      source: 'local-reasoner',
      degraded: false,
      route: 'local-agent',
      sources: [],
      sourceCount: 0,
    };
  }

  const natural = naturalLocalResponse({ prompt, tool });
  if (natural) {
    return {
      answer: freshnessBoundary(natural, freshnessNeeded),
      source: 'local-reasoner',
      degraded: true,
      route: 'local-agent',
      sources: [],
      sourceCount: 0,
    };
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
