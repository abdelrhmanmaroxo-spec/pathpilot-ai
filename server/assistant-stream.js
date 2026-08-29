import { buildProviderRequest } from './lib/ai-provider.js';
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

export function createAssistantStreamHandler({ env = process.env, database, fetchImpl = globalThis.fetch } = {}) {
  const apiKey = String(env.AI_API_KEY || '');
  const model = String(env.AI_MODEL || '');
  const apiMode = env.AI_API_MODE === 'responses' ? 'responses' : 'chat-completions';
  const baseUrl = String(env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const endpoint = String(env.AI_ENDPOINT || `${baseUrl}/${apiMode === 'responses' ? 'responses' : 'chat/completions'}`);
  const reasoningEffort = String(env.AI_REASONING_EFFORT || '');
  const aiConfigured = Boolean(apiKey && model);

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
    const timeoutMs = Math.max(20_000, Math.min(120_000, Number(env.AI_STREAM_TIMEOUT_MS || 90_000)));
    const timeout = setTimeout(() => controller.abort(new Error('PROVIDER_STREAM_TIMEOUT')), timeoutMs);
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

      const providerRequest = {
        ...buildProviderRequest({
          apiMode,
          model,
          prompt,
          mode,
          tool,
          preferences: body.preferences || {},
          reasoningEffort,
        }),
        stream: true,
      };

      const providerResponse = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(providerRequest),
        signal: controller.signal,
      });

      if (!providerResponse.ok) throw new Error(`PROVIDER_${providerResponse.status}`);
      if (!providerResponse.body) throw new Error('PROVIDER_STREAM_EMPTY');

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
      writeEvent(response, 'meta', { requestId, source: 'live', route: 'direct-ai-stream' });

      for await (const delta of iterateProviderTextDeltas(providerResponse.body, { apiMode })) {
        if (controller.signal.aborted) throw controller.signal.reason || new Error('STREAM_ABORTED');
        answer += delta;
        writeEvent(response, 'delta', { text: delta });
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
        metadata: { source: 'live-stream' },
      });
      writeEvent(response, 'done', {
        requestId,
        source: 'live',
        route: 'direct-ai-stream',
        latencyMs,
        characterCount: answer.length,
      });
      response.end();
    } catch (error) {
      const aborted = controller.signal.aborted;
      const code = aborted
        ? (String(controller.signal.reason?.message || '').includes('CLIENT_DISCONNECTED') ? 'REQUEST_ABORTED' : 'PROVIDER_TIMEOUT')
        : String(error?.message || 'STREAM_FAILED').slice(0, 80);

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
      response.off?.('close', abortOnDisconnect);
    }
  };
}
