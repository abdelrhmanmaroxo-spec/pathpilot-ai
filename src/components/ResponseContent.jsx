import { Copy, ExternalLink, FileText, Globe2 } from 'lucide-react';

function language() {
  return document.body?.dataset?.language === 'en' ? 'en' : 'ar';
}

function extractUrls(text) {
  const matches = String(text || '').match(/https?:\/\/[^\s)\]}>,]+/g) || [];
  return [...new Set(matches.map((url) => url.replace(/[.,;:!?]+$/, '')))];
}

function cleanDisplayAnswer(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/^🌐\s*PathPilot Research Beta\s*\n(?:تم (?:تحليل|اختيار|التحقق)[^\n]*\n)?/i, '')
    .replace(/^🧠\s*PathPilot AI(?: fallback)? Beta\s*\n/i, '')
    .replace(/\n\nالمصادر المختارة\s*\(\d+\)[\s\S]*$/i, '')
    .replace(/\n\nSelected sources\s*\(\d+\)[\s\S]*$/i, '')
    .trim();
}

function splitBlocks(value) {
  const text = cleanDisplayAnswer(value);
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

function normalizeSources(answer, sources) {
  if (Array.isArray(sources) && sources.length) {
    return sources.slice(0, 8).map((source) => ({
      title: String(source?.title || source?.domain || source?.url || '').trim(),
      url: String(source?.url || '').trim(),
      domain: String(source?.domain || '').trim(),
      snippet: String(source?.snippet || '').trim(),
      quality: Number(source?.quality || 0),
    })).filter((source) => source.url);
  }
  return extractUrls(answer).slice(0, 8).map((url) => {
    let domain = url;
    try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch { /* keep URL */ }
    return { title: domain, url, domain, snippet: '', quality: 0 };
  });
}

export function SourceList({ answer, sources = [] }) {
  const items = normalizeSources(answer, sources);
  if (!items.length) return null;
  const en = language() === 'en';
  return (
    <aside className="answer-sources" aria-label={en ? 'Sources' : 'المصادر'}>
      <div className="source-panel-heading">
        <span><Globe2 size={17} /></span>
        <div><strong>{en ? 'Sources' : 'المصادر'}</strong><small>{items.length} {en ? 'selected references' : 'مراجع مختارة'}</small></div>
      </div>
      <div className="source-card-list">
        {items.map((source, index) => (
          <a className="source-card" key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer">
            <span className="source-number">{index + 1}</span>
            <span className="source-card-icon"><FileText size={16} /></span>
            <span className="source-card-copy">
              <strong>{source.title || source.domain}</strong>
              <small>{source.domain || source.url}</small>
            </span>
            <ExternalLink className="source-external" size={14} />
          </a>
        ))}
      </div>
    </aside>
  );
}

export default function ResponseContent({ answer }) {
  const en = language() === 'en';
  const copyCode = async (value) => navigator.clipboard.writeText(value);
  return (
    <div className="response-content">
      {splitBlocks(answer).map((block, index) => (
        block.type === 'code' ? (
          <section key={`code-${index}`} className="answer-code">
            <div className="answer-code-head">
              <small>{block.language || (en ? 'code' : 'كود')}</small>
              <button type="button" onClick={() => copyCode(block.value)} title={en ? 'Copy code' : 'نسخ الكود'} aria-label={en ? 'Copy code' : 'نسخ الكود'}><Copy size={14} /></button>
            </div>
            <pre><code>{block.value}</code></pre>
          </section>
        ) : <div key={`text-${index}`}>{TextBlock({ value: block.value })}</div>
      ))}
    </div>
  );
}
