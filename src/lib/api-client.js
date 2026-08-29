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

export function createApiClient({
  baseUrl,
  getToken = () => '',
  fetchImpl = globalThis.fetch,
  timeoutMs = 25_000,
  sendClientRequestId = false,
} = {}) {
  const normalizedBase = String(baseUrl || '').replace(/\/$/, '');

  async function request(path, options = {}) {
    if (!normalizedBase) {
      throw new PathPilotApiError('Backend is not configured.', { code: 'BACKEND_NOT_CONFIGURED' });
    }
    if (typeof fetchImpl !== 'function') {
      throw new PathPilotApiError('Fetch is not available.', { code: 'FETCH_UNAVAILABLE' });
    }

    const localRequestId = options.requestId || createRequestId();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('API_TIMEOUT')), options.timeoutMs || timeoutMs);
    const externalSignal = options.signal;
    const abortFromExternal = () => controller.abort(externalSignal?.reason || new Error('REQUEST_ABORTED'));
    externalSignal?.addEventListener?.('abort', abortFromExternal, { once: true });

    try {
      const token = getToken?.() || '';
      const headers = new Headers(options.headers || {});
      const hasBody = options.body !== undefined && options.body !== null;
      const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
      if (hasBody && !isFormData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
      if (sendClientRequestId && !headers.has('X-Request-ID')) headers.set('X-Request-ID', localRequestId);

      const response = await fetchImpl(`${normalizedBase}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
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
      if (controller.signal.aborted) {
        throw new PathPilotApiError('The request timed out or was cancelled.', {
          code: externalSignal?.aborted ? 'REQUEST_ABORTED' : 'API_TIMEOUT',
          requestId: localRequestId,
          cause: error,
        });
      }
      throw new PathPilotApiError(error?.message || 'Network request failed.', {
        code: 'NETWORK_ERROR',
        requestId: localRequestId,
        cause: error,
      });
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener?.('abort', abortFromExternal);
    }
  }

  return { request };
}
