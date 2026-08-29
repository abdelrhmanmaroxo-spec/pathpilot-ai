import {
  ArrowLeft,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  CircleHelp,
  Download,
  GraduationCap,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  WifiOff,
} from 'lucide-react';

export default function Landing({ onSelect, onInstall }) {
  return (
    <main>
      <section className="hero page-shell">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={15} /> ASK. LEARN. BUILD. DECIDE.</div>
          <h1>مساعد واحد<br /><span>لأي سؤال أو مهمة.</span></h1>
          <p className="hero-lead">ثلاث مساحات و18 أداة لتنظيم أي طلب: مساعد عام مرن، أدوات دراسة، وأدوات عمل احترافية.</p>
          <div className="hero-actions">
            <button className="button button-primary" type="button" onClick={() => onSelect('general')}>اسأل أي حاجة <ArrowLeft size={18} /></button>
            <button className="button button-secondary" type="button" onClick={() => onSelect('study')}>الدراسة</button>
            <button className="button button-secondary" type="button" onClick={() => onSelect('work')}>العمل</button>
          </div>
          <div className="trust-row">
            <span><ShieldCheck size={17} /> طبقات ذكاء متعددة</span>
            <span><Smartphone size={17} /> موقع + تطبيق</span>
            <span><WifiOff size={17} /> Local fallback</span>
          </div>
          <p className="local-ai-note"><CircleHelp size={16} /> يستخدم AI حي عند توفره، ومعه موسوعة واستدلال محلي، ويمكن تفعيل Local LLM على الأجهزة الداعمة.</p>
        </div>

        <div className="hero-visual" aria-label="معاينة PathPilot AI">
          <div className="glow glow-one" />
          <div className="glow glow-two" />
          <div className="preview-window">
            <div className="preview-topbar"><i /><i /><i /><span>pathpilot.ai</span></div>
            <div className="preview-body">
              <div className="preview-side"><span className="preview-logo">P</span><i className="selected" /><i /><i /><i /></div>
              <div className="preview-main">
                <div className="preview-kicker">STUDY WORKSPACE</div>
                <h3>جاهز نبدأ؟</h3>
                <div className="preview-prompt"><Sparkles size={17} /> اشرح التعلّم العميق ببساطة</div>
                <div className="preview-answer"><span><BrainCircuit size={21} /></span><div><b>شرح مبسّط</b><i /><i /><i className="short" /></div></div>
              </div>
            </div>
          </div>
          <div className="floating-card floating-study"><GraduationCap /> <span><b>Study</b><small>6 smart tools</small></span></div>
          <div className="floating-card floating-work"><BriefcaseBusiness /> <span><b>Work</b><small>6 pro tools</small></span></div>
        </div>
      </section>

      <section className="proof-strip">
        <div className="page-shell proof-grid">
          <div><strong>03</strong><span>مساحات متخصصة</span></div>
          <div><strong>18</strong><span>أداة عملية</span></div>
          <div><strong>PWA</strong><span>قابل للتثبيت</span></div>
          <div><strong>AI</strong><span>Live + Local tiers</span></div>
        </div>
      </section>

      <section className="section page-shell" id="workspaces">
        <div className="section-heading">
          <div className="eyebrow"><Target size={15} /> ONE APP. THREE WORKSPACES.</div>
          <h2>أي طلب له مساحة مناسبة.</h2>
          <p>ابدأ بالمساعد العام لأي موضوع، أو استخدم أدوات الدراسة والعمل للمخرجات المتخصصة.</p>
        </div>
        <div className="workspace-cards">
          <article className="workspace-card general-card">
            <div className="workspace-icon"><Sparkles /></div><span className="card-number">01</span><h3>Universal Workspace</h3>
            <p>لأي سؤال أو مشكلة أو نص أو فكرة أو قرار من أي مستخدم.</p>
            <ul><li><Check /> فهم تلقائي لنوع الطلب</li><li><Check /> تحسين وتنظيم أي نص</li><li><Check /> توليد أفكار ومقارنة خيارات</li><li><Check /> تنظيم اليوم وصناعة المحتوى</li></ul>
            <button type="button" onClick={() => onSelect('general')}>افتح المساعد العام <ChevronLeft /></button>
          </article>
          <article className="workspace-card study-card">
            <div className="workspace-icon"><GraduationCap /></div><span className="card-number">02</span><h3>Study Workspace</h3>
            <p>لفهم المحاضرات، ضغط وقت المراجعة، وتحويل الهدف إلى خطة يومية.</p>
            <ul><li><Check /> شرح متدرج مع أمثلة</li><li><Check /> تلخيص وكلمات أساسية</li><li><Check /> خطة مذاكرة قابلة للتنفيذ</li><li><Check /> اختبار مراجعة نشط</li><li><Check /> بطاقات سؤال وجواب</li><li><Check /> خريطة بحث منظمة</li></ul>
            <button type="button" onClick={() => onSelect('study')}>ابدأ الدراسة <ChevronLeft /></button>
          </article>
          <article className="workspace-card work-card">
            <div className="workspace-icon"><BriefcaseBusiness /></div><span className="card-number">03</span><h3>Work Workspace</h3>
            <p>للكتابة المهنية، تخطيط التنفيذ، توثيق الاجتماعات وعرض الخبرة.</p>
            <ul><li><Check /> بريد احترافي واضح</li><li><Check /> مهام وأولويات ومخرجات</li><li><Check /> قرارات وخطوات من الاجتماعات</li><li><Check /> CV bullets بلا ادعاءات</li><li><Check /> خطاب تقديم مخصص</li><li><Check /> تقارير جودة وBug Reports</li></ul>
            <button type="button" onClick={() => onSelect('work')}>ابدأ العمل <ChevronLeft /></button>
          </article>
        </div>
      </section>

      <section className="install-cta page-shell">
        <div>
          <span className="eyebrow"><Smartphone size={15} /> INSTALLABLE PWA</span>
          <h2>نفس التجربة. موقع وتطبيق.</h2>
          <p>ثبّت PathPilot على Windows أو Android أو iPhone/iPad وافتحه بسرعة حتى مع اتصال ضعيف.</p>
          <div className="install-platforms"><span>Windows</span><span>Android</span><span>iOS</span><span>Local Intelligence</span></div>
        </div>
        <button className="button button-light" type="button" onClick={onInstall}><Download size={18} /> تثبيت PathPilot</button>
      </section>
    </main>
  );
}
