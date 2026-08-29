import { randomUUID } from 'node:crypto';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,120}$/;

export function resolveRequestId(request) {
  const incoming = String(request?.headers?.['x-request-id'] || '').trim();
  if (REQUEST_ID_PATTERN.test(incoming)) return incoming;
  return `pp-${randomUUID()}`;
}

export function attachRequestContext(request, response) {
  const requestId = resolveRequestId(request);
  request.pathPilotRequestId = requestId;
  response.setHeader('X-Request-ID', requestId);
  response.setHeader('Access-Control-Expose-Headers', 'X-Request-ID');
  return requestId;
}
