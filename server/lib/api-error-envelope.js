const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,80}$/;

const STATUS_ERROR_CODES = new Map([
  [400, 'INVALID_REQUEST'],
  [401, 'UNAUTHORIZED'],
  [403, 'FORBIDDEN'],
  [404, 'NOT_FOUND'],
  [405, 'METHOD_NOT_ALLOWED'],
  [409, 'CONFLICT'],
  [413, 'BODY_TOO_LARGE'],
  [429, 'RATE_LIMITED'],
  [500, 'INTERNAL_ERROR'],
  [502, 'UPSTREAM_FAILED'],
  [503, 'SERVICE_UNAVAILABLE'],
  [504, 'UPSTREAM_TIMEOUT'],
]);

export function defaultApiErrorCode(status) {
  return STATUS_ERROR_CODES.get(Number(status)) || 'REQUEST_FAILED';
}

export function normalizeApiErrorPayload(payload, { status = 500, requestId = '' } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || typeof payload.error !== 'string') {
    return payload;
  }

  const explicitCode = String(payload.code || '').trim();
  const code = ERROR_CODE_PATTERN.test(explicitCode) ? explicitCode : defaultApiErrorCode(status);
  return {
    ...payload,
    code,
    requestId: String(payload.requestId || requestId || ''),
  };
}

function isJsonResponse(response) {
  return /(^|\s|;)application\/json(?:;|$)/i.test(String(response.getHeader?.('content-type') || ''));
}

function decodeChunk(chunk, encoding) {
  if (Buffer.isBuffer(chunk)) return chunk.toString(typeof encoding === 'string' ? encoding : 'utf8');
  if (typeof chunk === 'string') return chunk;
  return null;
}

export function installApiErrorEnvelope(response, requestId) {
  const originalEnd = response.end;

  response.end = function endWithApiEnvelope(chunk, encoding, callback) {
    let nextChunk = chunk;
    const status = Number(response.statusCode || 200);

    if (status >= 400 && chunk != null && isJsonResponse(response)) {
      try {
        const text = decodeChunk(chunk, encoding);
        if (text != null) {
          const payload = JSON.parse(text);
          const normalized = normalizeApiErrorPayload(payload, { status, requestId });
          if (normalized !== payload) {
            nextChunk = JSON.stringify(normalized);
            if (response.hasHeader?.('content-length')) response.removeHeader?.('content-length');
          }
        }
      } catch {
        // Preserve malformed or non-object downstream responses unchanged.
      }
    }

    return originalEnd.call(this, nextChunk, encoding, callback);
  };

  return response;
}
