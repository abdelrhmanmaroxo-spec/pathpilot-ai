import {
  BrainCircuit,
  BriefcaseBusiness,
  ChevronLeft,
  Clock3,
  Copy,
  Download,
  GraduationCap,
  History,
  LoaderCircle,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  UserRound,
} from 'lucide-react';
import { hasLiveAI, TOOL_LIBRARY } from '../lib/assistant.js';
import { supportsBrowserLLM } from '../lib/local-llm.js';
import { TOOL_ICONS } from '../lib/tool-icons.js';
import AIOrb from './AIOrb.jsx';
import ResponseContent, { SourceList } from './ResponseContent.jsx';

function sourceLabel(source) {
  if (source === 'research-ai') return 'Web Research + AI · Beta';
  if (source === 'research-search') return 'Web Research · Beta';
  if (source === 'ai-fallback' || source === 'live') return 'Live AI · Beta';
  if (source === 'local-llm') return 'On-device Local LLM · Beta';
  if (source === 'local-fallback') return 'Local Super Reasoner · Beta';
  return 'PathPilot Intelligence · Beta';
}

function isEnglish() {
  return document.body?.dataset?.language === 'en';
}

export function ToolRail({ mode, selectedTool, onSelect }) {
  return (
    <aside className="tool-rail">
      <div className="tool-rail-main">
        <p className="rail-label">الأدوات</p>
        {TOOL_LIBRARY[mode].map((tool) => {
          const Icon = TOOL_ICONS[tool.id];
          return (
            <button className={selectedTool === tool.id ? 'tool-button active' : 'tool-button'} type="button" key={tool.id} onClick={() => onSelect(tool.id)}>
              <span><Icon size={20} /></span>
              <span><strong>{tool.label}</strong><small>{tool.description}</small></span>
              <ChevronLeft size={17} />
            </button>
          );
        })}
      </div>
      <AIOrb live={hasLiveAI} />
    </aside>
  );
}

export function ResultCard({ answer, source, sources = [], processingSeconds, onCopy, onDownload, onShare, onRate, onRegenerate, feedbackEnabled, loading = false }) {
  const en = isEnglish();
  if (loading && !answer) {
    return (
      <section className="processing-card" aria-live="polite" aria-label={en ? 'PathPilot is processing your request' : 'PathPilot يعالج طلبك'}>
        <div className="processing-card-head">
          <span className="processing-card-icon"><LoaderCircle className="spin" size={20} /></span>
          <div><strong>{en ? 'PathPilot is working on it' : 'PathPilot شغال على طلبك'}</strong><small>{en ? 'Routing, checking context, and preparing the best available answer.' : 'بيحدد المسار، يراجع السياق، ويجهز أفضل إجابة متاحة.'}</small></div>
        </div>
        <div className="processing-steps" aria-hidden="true">
          <div className="processing-step active"><i /><span>{en ? 'Understanding the request and constraints' : 'فهم الطلب والقيود'}</span></div>
          <div className="processing-step"><i /><span>{en ? 'Choosing live AI, research, or local fallback' : 'اختيار AI حي أو بحث أو fallback محلي'}</span></div>
          <div className="processing-step"><i /><span>{en ? 'Preparing and checking the final response' : 'تجهيز ومراجعة النتيجة النهائية'}</span></div>
        </div>
        <div className="processing-lines" aria-hidden="true"><span /><span /><span /></div>
      </section>
    );
  }
  if (!answer) {
    return (
      <div className="empty-result">
        <span><Sparkles /></span>
        <h3>النتيجة ستظهر هنا</h3>
        <p>اكتب تفاصيل حقيقية؛ كلما كان السياق أوضح كانت النتيجة أكثر فائدة.</p>
      </div>
    );
  }

  const hasSources = Array.isArray(sources) && sources.length > 0;

  return (
    <section className={hasSources ? 'result-card has-source-rail' : 'result-card'} aria-live="polite">
      <div className="result-head">
        <div className="result-identity">
          <span className="assistant-avatar"><Sparkles size={18} /></span>
          <div><strong>PathPilot Assistant</strong><small>{sourceLabel(source)}</small></div>
        </div>
        <div className="result-meta-actions">
          {Number.isFinite(processingSeconds) && (
            <span className="response-time-badge"><Clock3 size={14} /> {en ? 'Completed in' : 'اكتمل خلال'} {Number(processingSeconds).toFixed(1)}s</span>
          )}
          <div className="result-actions">
            {onRegenerate && <button type="button" onClick={onRegenerate} disabled={loading} title={en ? 'Regenerate answer' : 'إعادة إنشاء الإجابة'} aria-label={en ? 'Regenerate answer' : 'إعادة إنشاء الإجابة'}><RotateCcw size={17} /></button>}
            <button type="button" onClick={onCopy} title="نسخ النتيجة"><Copy size={17} /></button>
            <button type="button" onClick={onShare} title="مشاركة النتيجة"><Share2 size={17} /></button>
            <button type="button" onClick={onDownload} title="تنزيل النتيجة"><Download size={17} /></button>
          </div>
        </div>
      </div>
      <div className={hasSources ? 'result-content-grid' : 'result-content-grid no-sources'}>
        <div className="answer-main-panel">
          <ResponseContent answer={answer} />
          {feedbackEnabled && (
            <div className="result-feedback">
              <span>قيّم النتيجة</span>
              <div>{[1, 2, 3, 4, 5].map((rating) => <button type="button" key={rating} onClick={() => onRate(rating)} title={`${rating} من 5`} aria-label={`تقييم ${rating} من 5`}><Star size={16} /></button>)}</div>
            </div>
          )}
        </div>
        {hasSources && <SourceList answer={answer} sources={sources} />}
      </div>
    </section>
  );
}

export function HistoryPanel({ items, onOpen, onClear }) {
  return (
    <section className="history-panel">
      <div className="history-head">
        <div><History size={19} /><strong>آخر النتائج</strong></div>
        {items.length > 0 && <button type="button" onClick={onClear}><Trash2 size={15} /> مسح</button>}
      </div>
      {items.length === 0 ? (
        <p className="history-empty">لسه مفيش نتائج محفوظة على الجهاز.</p>
      ) : (
        <div className="history-list">
          {items.slice(0, 6).map((item) => (
            <button type="button" key={item.id} onClick={() => onOpen(item)}>
              <span className={`history-mode ${item.mode}`}>
                {item.mode === 'study' ? <GraduationCap size={16} /> : item.mode === 'work' ? <BriefcaseBusiness size={16} /> : <Sparkles size={16} />}
              </span>
              <span><strong>{item.prompt}</strong><small><Clock3 size={12} /> {new Date(item.createdAt).toLocaleDateString('ar-EG')}</small></span>
              <ChevronLeft size={16} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function PreferencesPanel({ preferences, onChange }) {
  const update = (key, value) => onChange({ ...preferences, [key]: value });
  const localLlmSupported = supportsBrowserLLM();
  return (
    <section className="preferences-panel" aria-label="خصّص النتيجة">
      <div className="preference-heading"><SlidersHorizontal size={17} /><span><strong>خصّص النتيجة</strong><small>تُحفظ الإعدادات على جهازك فقط</small></span></div>
      <label>
        <span><UserRound size={14} /> اسمك <small>اختياري</small></span>
        <input value={preferences.displayName} onChange={(event) => update('displayName', event.target.value)} placeholder="يظهر في الرسائل فقط" maxLength={60} />
      </label>
      <label>
        <span>النتيجة موجهة إلى</span>
        <select value={preferences.audience} onChange={(event) => update('audience', event.target.value)}>
          <option value="self">استخدام شخصي</option><option value="teacher">مدرس أو مشرف</option><option value="recruiter">مسؤول توظيف</option><option value="team">فريق عمل</option>
        </select>
      </label>
      <label>
        <span>مستوى التفاصيل</span>
        <select value={preferences.responseStyle} onChange={(event) => update('responseStyle', event.target.value)}>
          <option value="concise">مختصر</option><option value="balanced">متوازن</option><option value="detailed">مفصل</option>
        </select>
      </label>
      <label>
        <span><BrainCircuit size={14} /> Local LLM <small>تجريبي</small></span>
        <select value={preferences.localLlmEnabled ? 'on' : 'off'} onChange={(event) => update('localLlmEnabled', event.target.value === 'on')} disabled={!localLlmSupported}>
          <option value="off">متوقف</option><option value="on">مفعّل على هذا الجهاز</option>
        </select>
        <small>{localLlmSupported ? 'يشغّل نموذجًا لغويًا محليًا عبر WebGPU عند الحاجة. أول تشغيل قد يحتاج تنزيلًا كبيرًا، ثم يُستخدم Cache المتصفح.' : 'الجهاز أو المتصفح الحالي لا يوفّر WebGPU، وسيستمر استخدام Local Super Reasoner.'}</small>
      </label>
    </section>
  );
}