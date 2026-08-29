export class PathPilotApiError extends Error {
  constructor(message, { code = 'API_REQUEST_FAILED', status = 0, requestId = '', details = null, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'PathPilotApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }
}

export function createRequestId() {
  return globalThis.crypto?.randomUUID?.() || `pp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function fallbackCode(status) {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'AUTH_REQUIRED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVICE_UNAVAILABLE';
  return 'API_REQUEST_FAILED';
}

async function parsePayload(response) {
  const contentType = response.headers?.get?.('content-type') || '';
  if (contentType.includes('application/json')) return response.json().catch(() => ({}));
  const text = await response.text().catch(() => '');
  return text ? { message: text } : {};
}

function prepareRequest(options) {
  const {
    json,
    requestId,
    timeoutMs,
    signal,
    ...fetchOptions
  } = options;

  if (json !== undefined) {
    if (fetchOptions.body !== undefined && fetchOptions.body !== null) {
      throw new PathPilotApiError('Use either json or body, not both.', { code: 'INVALID_REQUEST_OPTIONS' });
    }
    fetchOptions.body = JSON.stringify(json);
  }

  return { fetchOptions, requestId, timeoutMs, signal };
}

function prepareHeaders({ fetchOptions, getToken, sendClientRequestId, requestId }) {
  const token = getToken?.() || '';
  const headers = new Headers(fetchOptions.headers || {});
  const hasBody = fetchOptions.body !== undefined && fetchOptions.body !== null;
  const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
  if (hasBody && !isFormData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  if (sendClientRequestId && !headers.has('X-Request-ID')) headers.set('X-Request-ID', requestId);
  return headers;
}

function createAbortRuntime(prepared, defaultTimeoutMs, requestId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('API_TIMEOUT')), prepared.timeoutMs || defaultTimeoutMs);
  const externalSignal = prepared.signal;
  const abortFromExternal = () => controller.abort(externalSignal?.reason || new Error('REQUEST_ABORTED'));
  externalSignal?.addEventListener?.('abort', abortFromExternal, { once: true });
  return {
    controller,
    externalSignal,
    cleanup() {
      clearTimeout(timer);
      externalSignal?.removeEventListener?.('abort', abortFromExternal);
    },
    normalizeAbort(error) {
      return new PathPilotApiError('The request timed out or was cancelled.', {
        code: externalSignal?.aborted ? 'REQUEST_ABORTED' : 'API_TIMEOUT',
        requestId,
        cause: error,
      });
    },
  };
}

function parseSseBlock(block) {
  const lines = String(block || '').split(/\r?\n/);
  const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() || 'message';
  const rawData = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n');
  if (!rawData) return null;
  let data = rawData;
  try {
    data = JSON.parse(rawData);
  } catch {
    // Text SSE payloads are valid and remain strings.
  }
  return { event, data };
}

function findSseBoundary(buffer) {
  const lf = buffer.indexOf('\n\n');
  const crlf = buffer.indexOf('\r\n\r\n');
  if (lf < 0) return crlf;
  if (crlf < 0) return lf;
  return Math.min(lf, crlf);
}

function sseBoundaryLength(buffer, index) {
  return buffer.startsWith('\r\n\r\n', index) ? 4 : 2;
}

export function createApiClient({
  baseUrl,
  getToken = () => '',
  fetchImpl = globalThis.fetch,
  timeoutMs = 25_000,
  sendClientRequestId = false,
} = {}) {
  const normalizedBase = String(baseUrl || '').replace(/\/$/, '');

  function assertAvailable() {
    if (!normalizedBase) {
      throw new PathPilotApiError('Backend is not configured.', { code: 'BACKEND_NOT_CONFIGURED' });
    }
    if (typeof fetchImpl !== 'function') {
      throw new PathPilotApiError('Fetch is not available.', { code: 'FETCH_UNAVAILABLE' });
    }
  }

  async function request(path, options = {}) {
    assertAvailable();
    const prepared = prepareRequest(options);
    const localRequestId = prepared.requestId || createRequestId();
    const runtime = createAbortRuntime(prepared, timeoutMs, localRequestId);

    try {
      const headers = prepareHeaders({ fetchOptions: prepared.fetchOptions, getToken, sendClientRequestId, requestId: localRequestId });
      const response = await fetchImpl(`${normalizedBase}${path}`, {
        ...prepared.fetchOptions,
        headers,
        signal: runtime.controller.signal,
      });
      const payload = await parsePayload(response);
      const serverRequestId = response.headers?.get?.('x-request-id') || localRequestId;

      if (!response.ok) {
        throw new PathPilotApiError(
          payload.error || payload.message || `Request failed with ${response.status}`,
          {
            code: payload.code || fallbackCode(response.status),
            status: response.status,
            requestId: serverRequestId,
            details: payload,
          },
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof PathPilotApiError) throw error;
      if (runtime.controller.signal.aborted) throw runtime.normalizeAbort(error);
      throw new PathPilotApiError(error?.message || 'Network request failed.', {
        code: 'NETWORK_ERROR',
        requestId: localRequestId,
        cause: error,
      });
    } finally {
      runtime.cleanup();
    }
  }

  async function* streamEvents(path, options = {}) {
    assertAvailable();
    const prepared = prepareRequest(options);
    const localRequestId = prepared.requestId || createRequestId();
    const runtime = createAbortRuntime(prepared, timeoutMs, localRequestId);
    let reader = null;
    let completed = false;

    try {
      const headers = prepareHeaders({ fetchOptions: prepared.fetchOptions, getToken, sendClientRequestId, requestId: localRequestId });
      if (!headers.has('Accept')) headers.set('Accept', 'text/event-stream');
      const response = await fetchImpl(`${normalizedBase}${path}`, {
        ...prepared.fetchOptions,
        headers,
        signal: runtime.controller.signal,
      });
      const serverRequestId = response.headers?.get?.('x-request-id') || localRequestId;

      if (!response.ok) {
        const payload = await parsePayload(response);
        throw new PathPilotApiError(
          payload.error || payload.message || `Request failed with ${response.status}`,
          {
            code: payload.code || fallbackCode(response.status),
            status: response.status,
            requestId: serverRequestId,
            details: payload,
          },
        );
      }
      if (!response.body?.getReader) {
        throw new PathPilotApiError('Streaming is not available in this browser.', {
          code: 'STREAM_UNAVAILABLE',
          status: response.status,
          requestId: serverRequestId,
        });
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          completed = true;
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        let boundary = findSseBoundary(buffer);
        while (boundary >= 0) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + sseBoundaryLength(buffer, boundary));
          const parsed = parseSseBlock(block);
          if (parsed) yield { ...parsed, requestId: serverRequestId };
          boundary = findSseBoundary(buffer);
        }
      }

      buffer += decoder.decode();
      const parsed = parseSseBlock(buffer);
      if (parsed) yield { ...parsed, requestId: serverRequestId };
    } catch (error) {
      if (error instanceof PathPilotApiError) throw error;
      if (runtime.controller.signal.aborted) throw runtime.normalizeAbort(error);
      throw new PathPilotApiError(error?.message || 'Streaming request failed.', {
        code: 'NETWORK_ERROR',
        requestId: localRequestId,
        cause: error,
      });
    } finally {
      if (reader) {
        if (!completed) await reader.cancel().catch(() => {});
        reader.releaseLock?.();
      }
      runtime.cleanup();
    }
  }

  return { request, streamEvents };
}
