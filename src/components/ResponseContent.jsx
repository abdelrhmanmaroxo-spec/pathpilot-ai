import { Copy, ExternalLink } from 'lucide-react';

function language() {
  return document.body?.dataset?.language === 'en' ? 'en' : 'ar';
}

function extractUrls(text) {
  const matches = String(text || '').match(/https?:\/\/[^\s)\]}>,]+/g) || [];
  return [...new Set(matches.map((url) => url.replace(/[.,;:!?]+$/, '')))];
}

function splitBlocks(value) {
  const text = String(value || '').replace(/\r\n/g, '\n');
  const blocks = [];
  const fence = /```([^\n]*)\n([\s\S]*?)```/g;
  let cursor = 0;
  let match;
  while ((match = fence.exec(text))) {
    if (match.index > cursor) blocks.push({ type: 'text', value: text.slice(cursor, match.index) });
    blocks.push({ type: 'code', language: match[1].trim(), value: match[2].replace(/\n$/, '') });
    cursor = fence.lastIndex;
  }
  if (cursor < text.length) blocks.push({ type: 'text', value: text.slice(cursor) });
  return blocks;
}

function InlineText({ value }) {
  const chunks = String(value || '').split(/(https?:\/\/[^\s)\]}>,]+)/g);
  return chunks.map((chunk, index) => {
    if (/^https?:\/\//.test(chunk)) {
      return <a key={`${chunk}-${index}`} href={chunk} target="_blank" rel="noreferrer">{chunk}</a>;
    }
    const bold = chunk.split(/(\*\*[^*]+\*\*)/g);
    return bold.map((piece, pieceIndex) => (
      /^\*\*[^*]+\*\*$/.test(piece)
        ? <strong key={`${index}-${pieceIndex}`}>{piece.slice(2, -2)}</strong>
        : <span key={`${index}-${pieceIndex}`}>{piece}</span>
    ));
  });
}

function TextBlock({ value }) {
  const lines = String(value || '').split('\n');
  const nodes = [];
  let list = [];
  let listType = '';

  const flushList = () => {
    if (!list.length) return;
    const Tag = listType === 'ol' ? 'ol' : 'ul';
    nodes.push(<Tag key={`list-${nodes.length}`}>{list.map((item, index) => <li key={`${item}-${index}`}><InlineText value={item} /></li>)}</Tag>);
    list = [];
    listType = '';
  };

  lines.forEach((raw, index) => {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      return;
    }
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
    if (ordered || bullet) {
      const nextType = ordered ? 'ol' : 'ul';
      if (list.length && listType !== nextType) flushList();
      listType = nextType;
      list.push((ordered || bullet)[1]);
      return;
    }
    flushList();
    const heading = line.match(/^\s*(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = Math.min(4, heading[1].length + 1);
      const Tag = `h${level}`;
      nodes.push(<Tag key={`h-${index}`}><InlineText value={heading[2]} /></Tag>);
      return;
    }
    if (/^\s*>\s?/.test(line)) {
      nodes.push(<blockquote key={`q-${index}`}><InlineText value={line.replace(/^\s*>\s?/, '')} /></blockquote>);
      return;
    }
    nodes.push(<p key={`p-${index}`}><InlineText value={line.trim()} /></p>);
  });
  flushList();
  return nodes;
}

export function SourceList({ answer }) {
  const urls = extractUrls(answer);
  if (!urls.length) return null;
  const en = language() === 'en';
  return (
    <section className="answer-sources" aria-label={en ? 'Sources' : 'المصادر'} style={{ marginTop: 18, display: 'grid', gap: 8 }}>
      <strong>{en ? 'Sources' : 'المصادر'}</strong>
      {urls.slice(0, 8).map((url, index) => {
        let host = url;
        try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* keep URL */ }
        return (
          <a key={url} href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: 8, alignItems: 'center', overflowWrap: 'anywhere' }}>
            <ExternalLink size={14} /> {index + 1}. {host}
          </a>
        );
      })}
    </section>
  );
}

export default function ResponseContent({ answer }) {
  const en = language() === 'en';
  const copyCode = async (value) => navigator.clipboard.writeText(value);
  return (
    <div className="response-content">
      {splitBlocks(answer).map((block, index) => (
        block.type === 'code' ? (
          <section key={`code-${index}`} className="answer-code" style={{ margin: '14px 0', border: '1px solid rgba(148,163,184,.18)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(15,23,42,.55)' }}>
              <small>{block.language || (en ? 'code' : 'كود')}</small>
              <button type="button" onClick={() => copyCode(block.value)} title={en ? 'Copy code' : 'نسخ الكود'} aria-label={en ? 'Copy code' : 'نسخ الكود'}><Copy size={14} /></button>
            </div>
            <pre style={{ margin: 0, padding: 12, overflowX: 'auto', whiteSpace: 'pre' }}><code>{block.value}</code></pre>
          </section>
        ) : <div key={`text-${index}`}>{TextBlock({ value: block.value })}</div>
      ))}
      <SourceList answer={answer} />
    </div>
  );
}
