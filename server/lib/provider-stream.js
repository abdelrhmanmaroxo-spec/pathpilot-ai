function extractChatCompletionDelta(payload) {
  const content = payload?.choices?.[0]?.delta?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((item) => item?.text || '').join('');
  }
  return '';
}

function extractResponsesDelta(payload) {
  if (payload?.type === 'response.output_text.delta' && typeof payload.delta === 'string') {
    return payload.delta;
  }
  if (typeof payload?.delta === 'string' && /output_text/i.test(String(payload?.type || ''))) {
    return payload.delta;
  }
  return '';
}

export function extractProviderStreamDelta(payload, apiMode = 'chat-completions') {
  if (!payload || typeof payload !== 'object') return '';
  return apiMode === 'responses'
    ? extractResponsesDelta(payload)
    : extractChatCompletionDelta(payload);
}

function eventBoundaryIndex(buffer) {
  const lf = buffer.indexOf('\n\n');
  const crlf = buffer.indexOf('\r\n\r\n');
  if (lf < 0) return crlf;
  if (crlf < 0) return lf;
  return Math.min(lf, crlf);
}

function eventBoundaryLength(buffer, index) {
  return buffer.startsWith('\r\n\r\n', index) ? 4 : 2;
}

function parseEventBlock(block) {
  const data = String(block || '')
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
    .trim();
  if (!data || data === '[DONE]') return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function* iterateProviderTextDeltas(body, { apiMode = 'chat-completions' } = {}) {
  if (!body?.getReader) throw new Error('PROVIDER_STREAM_UNAVAILABLE');
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = eventBoundaryIndex(buffer);
      while (boundary >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + eventBoundaryLength(buffer, boundary));
        const payload = parseEventBlock(block);
        const delta = extractProviderStreamDelta(payload, apiMode);
        if (delta) yield delta;
        boundary = eventBoundaryIndex(buffer);
      }
    }

    buffer += decoder.decode();
    const payload = parseEventBlock(buffer);
    const delta = extractProviderStreamDelta(payload, apiMode);
    if (delta) yield delta;
  } finally {
    reader.releaseLock?.();
  }
}
