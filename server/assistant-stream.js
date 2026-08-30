import { buildProviderRequest, extractProviderText } from './lib/ai-provider.js';
import { trackAiRequest, trackEvent } from './lib/database.js';
import { iterateProviderTextDeltas } from './lib/provider-stream.js';

const VALID_MODES = new Set(['general', 'study', 'work']);
const MAX_STREAM_PROMPT_CHARS = 12_000;

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 128_000) throw new Error('REQUEST_TOO_LARGE');
  }
  return JSON.parse(body || '{}');
}

function writeJson(response, status, payload, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function writeEvent(response, event, data) {
  if (response.destroyed || response.writableEnded) return false;
  return response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function usesBufferedProgressiveDelivery({ provider = '', baseUrl = '', streamMode = '' } = {}) {
  const requestedMode = String(streamMode || '').trim().toLowerCase();
  if (requestedMode === 'native') return false;
  if (requestedMode === 'buffered') return true;
  return /gemini/i.test(String(provider || '')) || /generativelanguage\.googleapis\.com/i.test(String(baseUrl || ''));
}

export function chunkVisibleAnswer(value, maxChars = 28) {
  const text = String(value || '');
  const limit = Math.max(8, Number(maxChars) || 28);
  const chunks = [];
  let index = 0;
  while (index < text.length) {
    let end = Math.min(text.length, index + limit);
    if (end < text.length) {
      const whitespace = Math.max(text.lastIndexOf(' ', end), text.lastIndexOf('\n', end));
      if (whitespace > index + Math.floor(limit / 2)) end = whitespace + 1;
    }
    chunks.push(text.slice(index, end));
    index = end;
  }
  return chunks;
}

function wait(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

export function classifyAssistantStreamError(error, { aborted = false, abortReason = null } = {}) {
  const reason = String(abortReason?.message || abortReason || '');
  if (aborted) {
    return {
      code: reason.includes('CLIENT_DISCONNECTED') ? 'REQUEST_ABORTED' : 'PROVIDER_TIMEOUT',
      providerStatus: 0,
    };
  }

  const message = String(error?.message || '');
  const providerStatus = Number(message.match(/^PROVIDER_(\d{3})$/)?.[1] || 0);
  if (providerStatus === 401 || providerStatus === 403) return { code: 'PROVIDER_AUTH_FAILED', providerStatus };
  if (providerStatus === 429) return { code: 'PROVIDER_RATE_LIMITED', providerStatus };
  if (providerStatus >= 500) return { code: 'PROVIDER_UNAVAILABLE', providerStatus };
  if (providerStatus >= 400) return { code: 'PROVIDER_REQUEST_REJECTED', providerStatus };
  if (message === 'PROVIDER_STREAM_EMPTY' || message === 'EMPTY_STREAM_RESPONSE') {
    return { code: 'EMPTY_PROVIDER_RESPONSE', providerStatus: 0 };
  }
  if (message === 'REQUEST_TOO_LARGE') return { code: 'BODY_TOO_LARGE', providerStatus: 0 };
  return { code: 'STREAM_FAILED', providerStatus: 0 };
}

export function createAssistantStreamHandler({ env = process.env, database, fetchImpl = globalThis.fetch } = {}) {
  const apiKey = String(env.AI_API_KEY || '');
  const model = String(env.AI_MODEL || '');
  const apiMode = env.AI_API_MODE === 'responses' ? 'responses' : 'chat-completions';
  const baseUrl = String(env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const endpoint = String(env.AI_ENDPOINT || `${baseUrl}/${apiMode === 'responses' ? 'responses' : 'chat/completions'}`);
  const provider = String(env.AI_PROVIDER || '');
  const reasoningEffort = String(env.AI_REASONING_EFFORT || '');
  const aiConfigured = Boolean(apiKey && model);
  const bufferedDelivery = usesBufferedProgressiveDelivery({ provider, baseUrl, streamMode: env.AI_STREAM_MODE });
  const progressiveDelayMs = Math.max(0, Math.min(80, Number(env.AI_BUFFERED_CHUNK_DELAY_MS ?? 18)));

  return async function handleAssistantStream({ request, response, user = null, cors = {}, requestId = '' } = {}) {
    const startedAt = Date.now();
    let mode = 'general';
    let tool = 'ask';
    let providerStarted = false;
    let answer = '';

    if (!aiConfigured) {
      writeJson(response, 503, {
        error: 'Live AI streaming is not configured.',
        code: 'AI_NOT_CONFIGURED',
        requestId,
      }, cors);
      return;
    }

    const controller = new AbortController();
    const timeoutMs = Math.max(20_000, Math.min(120_000, Number(
      bufferedDelivery
        ? env.AI_RESPONSE_TIMEOUT_MS || 60_000
        : env.AI_STREAM_TIMEOUT_MS || 90_000,
    )));
    const timeout = setTimeout(() => controller.abort(new Error('PROVIDER_STREAM_TIMEOUT')), timeoutMs);
    let heartbeat = null;
    const abortOnDisconnect = () => {
      if (!response.writableEnded && !controller.signal.aborted) controller.abort(new Error('CLIENT_DISCONNECTED'));
    };
    response.once('close', abortOnDisconnect);

    try {
      const body = await readJson(request);
      const prompt = String(body.prompt || '').trim();
      mode = VALID_MODES.has(body.mode) ? body.mode : 'general';
      tool = String(body.tool || 'ask').slice(0, 60);
      if (prompt.length < 2 || prompt.length > MAX_STREAM_PROMPT_CHARS) {
        writeJson(response, 400, { error: 'Prompt length is invalid.', code: 'INVALID_PROMPT', requestId }, cors);
        return;
      }

      const providerRequest = buildProviderRequest({
        apiMode,
        model,
        prompt,
        mode,
        tool,
        preferences: body.preferences || {},
        reasoningEffort,
      });
      if (!bufferedDelivery) providerRequest.stream = true;

      providerStarted = true;
      response.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Content-Type-Options': 'nosniff',
        ...cors,
      });
      response.flushHeaders?.();
      writeEvent(response, 'meta', {
        requestId,
        source: 'live',
        route: bufferedDelivery ? 'direct-ai-progressive' : 'direct-ai-stream',
        delivery: bufferedDelivery ? 'progressive' : 'native',
      });
      heartbeat = setInterval(() => {
        if (!response.destroyed && !response.writableEnded) response.write(': provider-working\n\n');
      }, 10_000);

      const providerResponse = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: bufferedDelivery ? 'application/json' : 'text/event-stream',
        },
        body: JSON.stringify(providerRequest),
        signal: controller.signal,
      });

      if (!providerResponse.ok) throw new Error(`PROVIDER_${providerResponse.status}`);

      if (bufferedDelivery) {
        const providerPayload = await providerResponse.json();
        answer = extractProviderText(providerPayload, apiMode);
        if (!answer.trim()) throw new Error('EMPTY_STREAM_RESPONSE');
        for (const delta of chunkVisibleAnswer(answer)) {
          if (controller.signal.aborted) throw controller.signal.reason || new Error('STREAM_ABORTED');
          writeEvent(response, 'delta', { text: delta });
          await wait(progressiveDelayMs);
        }
      } else {
        if (!providerResponse.body) throw new Error('PROVIDER_STREAM_EMPTY');
        for await (const delta of iterateProviderTextDeltas(providerResponse.body, { apiMode })) {
          if (controller.signal.aborted) throw controller.signal.reason || new Error('STREAM_ABORTED');
          answer += delta;
          writeEvent(response, 'delta', { text: delta });
        }
      }

      if (!answer.trim()) throw new Error('EMPTY_STREAM_RESPONSE');

      const latencyMs = Date.now() - startedAt;
      trackAiRequest(database, {
        userId: user?.id || null,
        workspace: mode,
        tool,
        model,
        status: 'success',
        latencyMs,
      });
      trackEvent(database, {
        userId: user?.id || null,
        eventType: 'tool_request',
        workspace: mode,
        tool,
        metadata: { source: bufferedDelivery ? 'live-progressive' : 'live-stream' },
      });
      writeEvent(response, 'done', {
        requestId,
        source: 'live',
        route: bufferedDelivery ? 'direct-ai-progressive' : 'direct-ai-stream',
        latencyMs,
        characterCount: answer.length,
      });
      response.end();
    } catch (error) {
      const aborted = controller.signal.aborted;
      const classified = classifyAssistantStreamError(error, {
        aborted,
        abortReason: controller.signal.reason,
      });
      const code = classified.code;

      trackAiRequest(database, {
        userId: user?.id || null,
        workspace: mode,
        tool,
        model,
        status: 'error',
        latencyMs: Date.now() - startedAt,
        errorCode: code,
      });

      if (providerStarted || response.headersSent) {
        if (!response.destroyed && !response.writableEnded) {
          writeEvent(response, 'error', {
            error: aborted ? 'The response stream was stopped.' : 'The AI provider could not complete the streamed response.',
            code,
            requestId,
          });
          response.end();
        }
        return;
      }

      writeJson(response, aborted ? 504 : 502, {
        error: aborted ? 'The AI provider timed out.' : 'The AI provider could not start a streamed response.',
        code,
        requestId,
      }, cors);
    } finally {
      clearTimeout(timeout);
      clearInterval(heartbeat);
      response.off?.('close', abortOnDisconnect);
    }
  };
}
