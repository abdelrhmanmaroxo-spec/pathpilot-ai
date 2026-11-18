import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Crown,
  Download,
  Globe,
  KeyRound,
  Link2,
  Mail,
  MonitorSmartphone,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Wifi,
  Zap,
} from 'lucide-react';
import {
  MAX_GOOGLE_AI_KEYS,
  addGoogleAiKeysBulk,
  clearGoogleAiKeyPool,
  loadGoogleAiKeyPool,
  removeGoogleAiKey,
  setGooglePoolPreferredModel,
  testGoogleAiKeyById,
  toggleGoogleAiKey,
} from '../lib/assistant.js';
import {
  getFreeCloudConfig,
  listLivePresenceSessions,
  saveFreeCloudConfig,
  testFreeCloudBridge,
} from '../lib/platform.js';
import AdminAnalytics from './AdminAnalytics.jsx';
import AdminApiUsage from './AdminApiUsage.jsx';
import AdminErrors from './AdminErrors.jsx';
import AdminFeedback from './AdminFeedback.jsx';
import AdminOwnerLog from './AdminOwnerLog.jsx';
import AdminSecurity from './AdminSecurity.jsx';
import AdminSupportTickets from './AdminSupportTickets.jsx';
import AdminSystemStatus from './AdminSystemStatus.jsx';
import AdminUsers from './AdminUsers.jsx';

function formatRelativeSeconds(lastActiveMs) {
  const diffSec = Math.max(0, Math.floor((Date.now() - Number(lastActiveMs || 0)) / 1000));
  if (diffSec < 15) return 'الآن (نشط لحظيًا)';
  if (diffSec < 60) return `منذ ${diffSec} ثانية`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
}

export default function AdminDashboardView({ user, onBack, controller }) {
  const {
    tab, setTab, data, accountLog, inviteEmail, setInviteEmail,
    notice, error, loading, roleBusy, deleteBusy, banBusy, resetBusy,
    inviteBusy, backupBusy, tabs: baseTabs, bannedUsers, percentages, pendingInvites,
    refresh, changeRole, changeBan, resetPassword, removeUser, addAdmin,
    revokeInvite, exportBackup,
  } = controller;

  const [liveSessions, setLiveSessions] = useState(() => listLivePresenceSessions());
  const [presenceFilter, setPresenceFilter] = useState('all');
  const [presenceQuery, setPresenceQuery] = useState('');
  const [copiedIp, setCopiedIp] = useState('');

  const [keyPool, setKeyPool] = useState(() => loadGoogleAiKeyPool());
  const [bulkKeysInput, setBulkKeysInput] = useState('');
  const [keyLabelPrefix, setKeyLabelPrefix] = useState('Google Gemini');
  const [testingKeyId, setTestingKeyId] = useState('');
  const [poolFeedback, setPoolFeedback] = useState('');

  const [cloudCfg, setCloudCfg] = useState(() => getFreeCloudConfig());
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [bridgeFeedback, setBridgeFeedback] = useState('');

  useEffect(() => {
    const syncLive = () => {
      setLiveSessions(listLivePresenceSessions());
      setKeyPool(loadGoogleAiKeyPool());
    };
    const timer = window.setInterval(syncLive, 8000);
    return () => window.clearInterval(timer);
  }, []);

  const expandedTabs = useMemo(() => {
    const extraFront = [
      ['live-users', `🟢 المتصلون الآن والـ IP (${liveSessions.filter((s) => s.isOnlineNow).length})`],
      ['ai-keys', `🔑 مفاتيح Google AI (${keyPool.totalCount}/${MAX_GOOGLE_AI_KEYS})`],
    ];
    const ownerBridge = user?.isOwner ? [['mail-bridge', '📧 إعدادات بريد المنصة']] : [];
    return [...extraFront, ...baseTabs, ...ownerBridge];
  }, [baseTabs, keyPool.totalCount, liveSessions, user?.isOwner]);

  const filteredPresence = useMemo(() => {
    const q = presenceQuery.trim().toLowerCase();
    return liveSessions.filter((s) => {
      if (presenceFilter === 'online' && !s.isOnlineNow) return false;
      if (!q) return true;
      const haystack = [
        s.ip, s.email, s.name, s.country, s.city, s.isp,
        s.currentRoute, s.browser, s.os, s.deviceType, s.role,
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [liveSessions, presenceFilter, presenceQuery]);

  const onlineNowCount = liveSessions.filter((s) => s.isOnlineNow).length;
  const uniqueIpCount = new Set(liveSessions.map((s) => s.ip)).size;

  const handleAddKeysSubmit = (event) => {
    event.preventDefault();
    if (!bulkKeysInput.trim()) return;
    const { added, pool } = addGoogleAiKeysBulk(bulkKeysInput, keyLabelPrefix.trim() || 'Google Gemini');
    setKeyPool(pool);
    setBulkKeysInput('');
    setPoolFeedback(
      added > 0
        ? `تم دمج وتشفير ${added} مفتاح Google جديد بنجاح! الإجمالي الآن ${pool.totalCount} من ${MAX_GOOGLE_AI_KEYS}.`
        : 'لم يتم إضافة مفاتيح جديدة (تأكد أن المفتاح صحيح أو غير مكرر ولم تتجاوز 200 مفتاح).',
    );
  };

  const handleTestKey = async (id) => {
    setTestingKeyId(id);
    setPoolFeedback('');
    try {
      const res = await testGoogleAiKeyById(id);
      setKeyPool(res.pool);
      setPoolFeedback(res.ok ? `المفتاح شغال بنجاح مع نموذج (${res.model})!` : `تنبيه فحص المفتاح: ${res.reason}`);
    } catch (err) {
      setPoolFeedback(err?.message || 'تعذر اختبار المفتاح.');
    } finally {
      setTestingKeyId('');
    }
  };

  const handleCopyEnvBundle = () => {
    const joined = keyPool.keys.filter((k) => k.enabled).map((k) => k.key).join(',');
    if (!joined) return;
    navigator.clipboard?.writeText(joined).catch(() => undefined);
    setPoolFeedback('تم نسخ جميع المفاتيح النشطة مفصولة بفاصلة — يمكنك وضعها أيضًا في متغير VITE_GEMINI_API_KEYS داخل إعدادات GitHub لو أردت.');
  };

  const handleSavePrivateBridge = async (event) => {
    event.preventDefault();
    const saved = saveFreeCloudConfig({
      bridgeUrl: cloudCfg.bridgeUrl,
      geminiApiKey: cloudCfg.geminiApiKey,
      geminiModel: cloudCfg.geminiModel,
    });
    setCloudCfg(saved);
    if (!saved.bridgeUrl) {
      setBridgeFeedback('تم حفظ الإعدادات.');
      return;
    }
    setBridgeBusy(true);
    const ping = await testFreeCloudBridge();
    setBridgeBusy(false);
    setBridgeFeedback(
      ping.ok
        ? `تم الاتصال بنجاح ببريد المنصة الرسمي (${saved.supportEmail})!`
        : 'تم حفظ الرابط، لكن فشل اختبار Ping — تأكد أن صلاحية Web App مضبوطة على Anyone.',
    );
  };

  const copyIpAddress = (ip) => {
    navigator.clipboard?.writeText(ip).catch(() => undefined);
    setCopiedIp(ip);
    window.setTimeout(() => setCopiedIp(''), 1500);
  };

  return (
    <main className="admin-page page-shell" style={{ maxWidth: 1360 }}>
      <header className="admin-header">
        <div>
          <span>PATHPILOT ENTERPRISE COMMAND CENTER</span>
          <h1>لوحة الإدارة والتحكم الموسعة</h1>
          <p>مراقبة المتصلين لحظيًا والـ IP والتفاصيل الكاملة، خزنة مفاتيح Google AI (حتى 200 مفتاح)، وتذاكر الدعم والحسابات.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={onBack}>العودة للمنصة</button>
          {user?.isOwner && (
            <button type="button" onClick={exportBackup} disabled={backupBusy}>
              <Download size={16} /> {backupBusy ? 'جاري التصدير…' : 'تصدير نسخة المالك الكاملة'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setLiveSessions(listLivePresenceSessions());
              setKeyPool(loadGoogleAiKeyPool());
              refresh();
            }}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'spin' : ''} size={16} /> تحديث فوري
          </button>
        </div>
      </header>

      {user?.isOwner && (
        <div className="admin-error" style={{ borderColor: 'rgba(255,215,64,.35)', color: 'inherit' }}>
          <Crown /> صلاحيات المالك الكاملة نشطة — جميع الإعدادات الحساسة ومفاتيح الـ AI وسجلات الـ IP معزولة هنا بالكامل ولا تظهر لأي مستخدم.
        </div>
      )}
      {notice && <div className="admin-error" style={{ borderColor: 'rgba(34,197,94,.35)', color: 'inherit' }}><CheckCircle2 /> {notice}</div>}
      {error && <div className="admin-error"><AlertTriangle /> {error}</div>}

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div className="admin-card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => setTab('live-users')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ opacity: 0.78 }}>المتصلون الآن (Online)</span>
            <Wifi size={18} color="#22c55e" />
          </div>
          <strong style={{ fontSize: '1.75rem', display: 'block', marginTop: 6 }}>{onlineNowCount}</strong>
          <small style={{ opacity: 0.72 }}>{uniqueIpCount} عنوان IP مسجل</small>
        </div>

        <div className="admin-card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => setTab('ai-keys')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ opacity: 0.78 }}>خزنة مفاتيح Google AI</span>
            <KeyRound size={18} color="#818cf8" />
          </div>
          <strong style={{ fontSize: '1.75rem', display: 'block', marginTop: 6 }}>
            {keyPool.activeCount} <small style={{ fontSize: '0.95rem', opacity: 0.7 }}>/ {MAX_GOOGLE_AI_KEYS}</small>
          </strong>
          <small style={{ opacity: 0.72 }}>{keyPool.totalUses} عملية تفكير ورد منفذة</small>
        </div>

        <div className="admin-card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => setTab('users')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ opacity: 0.78 }}>إجمالي الحسابات</span>
            <ShieldCheck size={18} color="#38bdf8" />
          </div>
          <strong style={{ fontSize: '1.75rem', display: 'block', marginTop: 6 }}>{data?.users?.length || 0}</strong>
          <small style={{ opacity: 0.72 }}>{bannedUsers.length} حساب محظور</small>
        </div>

        <div className="admin-card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => setTab('tickets')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ opacity: 0.78 }}>تذاكر الدعم الفني</span>
            <Mail size={18} color="#fbbf24" />
          </div>
          <strong style={{ fontSize: '1.75rem', display: 'block', marginTop: 6 }}>{data?.tickets?.length || 0}</strong>
          <small style={{ opacity: 0.72 }}>متابعة والرد المباشر بالإيميل</small>
        </div>
      </section>

      <AdminAnalytics data={data} percentages={percentages} bannedCount={bannedUsers.length} showBreakdown={tab === 'analytics'} />
      <AdminSystemStatus status={data?.status} />

      <nav className="admin-tabs" aria-label="Admin sections" style={{ flexWrap: 'wrap' }}>
        {expandedTabs.map(([id, label]) => (
          <button className={tab === id ? 'active' : ''} type="button" key={id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      {tab === 'live-users' && (
        <section className="admin-card" style={{ padding: 20, display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={20} color="#22c55e" /> مراقب المتصلين لحظيًا وتفاصيل الـ IP والحسابات
              </h2>
              <p style={{ margin: '4px 0 0', opacity: 0.75 }}>
                يعرض كل متصفح أو مستخدم متصل الآن، عنوان الـ IP الحقيقي، الدولة والمدينة والشبكة، البريد الإلكتروني، الجهاز، والصفحة المفتوحة حاليًا.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className={presenceFilter === 'online' ? 'button button-primary' : 'button button-ghost'}
                onClick={() => setPresenceFilter('online')}
              >
                المتصلون الآن فقط ({onlineNowCount})
              </button>
              <button
                type="button"
                className={presenceFilter === 'all' ? 'button button-primary' : 'button button-ghost'}
                onClick={() => setPresenceFilter('all')}
              >
                كل الجلسات ({liveSessions.length})
              </button>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)' }}>
            <Search size={16} />
            <input
              type="text"
              value={presenceQuery}
              onChange={(e) => setPresenceQuery(e.target.value)}
              placeholder="ابحث برقم الـ IP، البريد الإلكتروني، الاسم، الدولة، المتصفح، أو الصفحة المفتوحة..."
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'inherit', outline: 'none' }}
            />
          </label>

          {filteredPresence.length === 0 ? (
            <p style={{ opacity: 0.75, textAlign: 'center', padding: 24 }}>لا توجد جلسات مطابقة للبحث حاليًا.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {filteredPresence.map((s) => (
                <article
                  key={s.sessionId}
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    border: s.isOnlineNow ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: s.isOnlineNow ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          background: s.isOnlineNow ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.18)',
                          color: s.isOnlineNow ? '#4ade80' : '#cbd5e1',
                        }}
                      >
                        {s.isOnlineNow ? '🟢 متصل الآن' : '⚪ غير متصل'}
                      </span>
                      <strong style={{ fontSize: '1.02rem' }}>{s.name}</strong>
                      <code style={{ opacity: 0.9 }}>{s.email}</code>
                      <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(99, 102, 241, 0.2)' }}>
                        {s.role === 'owner' ? '👑 المالك' : s.role === 'admin' ? '🛡️ مشرف' : s.role === 'user' ? '👤 عضو مسجل' : '👀 زائر'}
                      </span>
                    </div>
                    <small style={{ opacity: 0.78 }}>{formatRelativeSeconds(s.lastActiveMs)}</small>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, fontSize: '0.9rem' }}>
                    <div>
                      <strong style={{ opacity: 0.7, display: 'block', fontSize: '0.78rem' }}>عنوان الـ IP والشبكة</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Globe size={14} />
                        <code>{s.ip}</code>
                        <button
                          type="button"
                          onClick={() => copyIpAddress(s.ip)}
                          style={{ padding: '2px 6px', fontSize: '0.74rem' }}
                          title="نسخ الـ IP"
                        >
                          <Copy size={12} /> {copiedIp === s.ip ? 'تم' : 'نسخ'}
                        </button>
                      </div>
                      <small style={{ opacity: 0.75 }}>{[s.country, s.city, s.isp].filter(Boolean).join(' · ') || 'شبكة محلية / غير محدد'}</small>
                    </div>

                    <div>
                      <strong style={{ opacity: 0.7, display: 'block', fontSize: '0.78rem' }}>الصفحة المفتوحة وآخر نشاط</strong>
                      <div><code>{s.currentRoute || '#/'}</code> — {s.lastAction}</div>
                      <small style={{ opacity: 0.75 }}>عدد التفاعلات: {s.actionsCount || 1} · المنطقة: {s.timezone || '-'}</small>
                    </div>

                    <div>
                      <strong style={{ opacity: 0.7, display: 'block', fontSize: '0.78rem' }}>الجهاز والمتصفح والشاشة</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MonitorSmartphone size={14} />
                        <span>{s.browser} · {s.os} · {s.deviceType}</span>
                      </div>
                      <small style={{ opacity: 0.75 }}>الشاشة: {s.screen || '-'} · اللغة: {s.language || '-'}</small>
                    </div>
                  </div>

                  <details style={{ fontSize: '0.8rem', opacity: 0.75 }}>
                    <summary style={{ cursor: 'pointer' }}>عرض البصمة التقنية الكاملة (User-Agent & Timestamps)</summary>
                    <div style={{ marginTop: 6, wordBreak: 'break-all' }}>
                      <div>أول دخول: {s.firstSeenAt ? new Date(s.firstSeenAt).toLocaleString('ar-EG') : '-'} | آخر ظهور: {s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString('ar-EG') : '-'}</div>
                      <div>معرف الزائر: <code>{s.visitorId}</code> | معرف الجلسة: <code>{s.sessionId}</code></div>
                      <div>User-Agent: <code>{s.userAgent}</code></div>
                    </div>
                  </details>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'ai-keys' && (
        <section className="admin-card" style={{ padding: 20, display: 'grid', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeyRound size={20} color="#818cf8" /> خزنة وموزع مفاتيح Google Gemini الذكي (حتى {MAX_GOOGLE_AI_KEYS} مفتاح)
              </h2>
              <p style={{ margin: '6px 0 0', opacity: 0.8 }}>
                أضف من مفتاح واحد وحتى <strong>200 مفتاح Google Gemini API</strong> دفعة واحدة. يقوم الموقع بتشفيرها وتوزيع الطلبات عليها بالتناوب التلقائي (Round-Robin) والتبديل اللحظي لو وصل مفتاح للحد المؤقت، ويستخدمها في التفكير العميق، الردود الذكية، إنشاء المجلدات، وتوليد ملفات الـ PDF.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={keyPool.preferredModel}
                onChange={(e) => setKeyPool(setGooglePoolPreferredModel(e.target.value))}
                style={{ padding: '8px 12px', borderRadius: 10 }}
              >
                <option value="auto">تلقائي ذكي (Gemini 3.8 Flash ← 2.5 Flash)</option>
                <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (أعلى حصة يومية)</option>
              </select>
              {keyPool.keys.length > 0 && (
                <button type="button" className="button button-ghost" onClick={handleCopyEnvBundle}>
                  <Copy size={15} /> نسخ المفاتيح لـ GitHub Env
                </button>
              )}
            </div>
          </div>

          {poolFeedback && (
            <div className="admin-error" style={{ borderColor: 'rgba(99, 102, 241, 0.45)', color: 'inherit' }}>
              <Zap size={16} /> {poolFeedback}
            </div>
          )}

          <form onSubmit={handleAddKeysSubmit} style={{ display: 'grid', gap: 12, padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <strong>إضافة مفاتيح جديدة ({keyPool.totalCount} / {MAX_GOOGLE_AI_KEYS} مستخدم حاليًا)</strong>
              <input
                type="text"
                value={keyLabelPrefix}
                onChange={(e) => setKeyLabelPrefix(e.target.value)}
                placeholder="بادئة اسم المفتاح (اختياري)"
                style={{ maxWidth: 220, padding: '6px 10px', borderRadius: 8 }}
              />
            </div>
            <textarea
              rows={4}
              value={bulkKeysInput}
              onChange={(e) => setBulkKeysInput(e.target.value)}
              placeholder={'الصق مفتاح واحد أو حتى 200 مفتاح Google AI Studio هنا (كل مفتاح في سطر أو مفصول بفاصلة)...\nAIzaSy...\nAIzaSy...'}
              style={{ width: '100%', fontFamily: 'monospace', padding: 12, borderRadius: 10 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              {keyPool.keys.length > 0 ? (
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => {
                    if (window.confirm('هل تريد مسح كل المفاتيح المحفوظة من الخزنة؟')) {
                      setKeyPool(clearGoogleAiKeyPool());
                      setPoolFeedback('تم تفريغ خزنة المفاتيح.');
                    }
                  }}
                >
                  <Trash2 size={15} /> مسح الكل
                </button>
              ) : <span />}
              <button type="submit" className="button button-primary">
                <Plus size={16} /> دمج وتشفير المفاتيح في الموقع
              </button>
            </div>
          </form>

          {keyPool.keys.length === 0 ? (
            <p style={{ opacity: 0.75, textAlign: 'center', padding: 18 }}>
              لم تضف مفاتيح Google بعد — الصق مفاتيحك بالأعلى ليبدأ الموقع فورًا باستخدامها بالتناوب الذكي.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 8, maxHeight: 480, overflowY: 'auto', paddingInlineEnd: 4 }}>
              {keyPool.keys.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.1)',
                    opacity: item.enabled ? 1 : 0.55,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <strong>#{item.index}</strong>
                    <span>{item.label}</span>
                    <code style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.28)' }}>{item.maskedKey}</code>
                    <span style={{ fontSize: '0.8rem' }}>
                      {!item.enabled
                        ? '⏸️ موقوف يدويًا'
                        : item.status === 'invalid'
                          ? '❌ غير صالح'
                          : item.isCoolingDown
                            ? '⏳ تبريد مؤقت (429)'
                            : '✅ نشط وجاهز'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <small style={{ opacity: 0.75 }}>الاستخدام: {item.uses || 0}</small>
                    <button
                      type="button"
                      className="button button-ghost"
                      disabled={testingKeyId === item.id}
                      onClick={() => handleTestKey(item.id)}
                      style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                    >
                      {testingKeyId === item.id ? 'يفحص…' : 'اختبار'}
                    </button>
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() => setKeyPool(toggleGoogleAiKey(item.id))}
                      style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                    >
                      <Power size={13} /> {item.enabled ? 'إيقاف' : 'تفعيل'}
                    </button>
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() => setKeyPool(removeGoogleAiKey(item.id))}
                      style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'mail-bridge' && user?.isOwner && (
        <section className="admin-card" style={{ padding: 20, display: 'grid', gap: 14 }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link2 size={20} /> إعدادات ربط البريد الرسمي للمنصة (خاص بالمالك فقط)
          </h2>
          <p style={{ margin: 0, opacity: 0.78 }}>
            إعدادات الإرسال التلقائي لأكواد التفعيل (OTP) وإشعارات تذاكر الدعم عبر البريد الرسمي <code>{cloudCfg.supportEmail}</code>.
          </p>
          {bridgeFeedback && (
            <div className="admin-error" style={{ borderColor: 'rgba(34,197,94,.4)', color: 'inherit' }}>
              <CheckCircle2 size={16} /> {bridgeFeedback}
            </div>
          )}
          <form onSubmit={handleSavePrivateBridge} style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>رابط خدمة البريد السحابية (Web App URL)</span>
              <input
                type="url"
                value={cloudCfg.bridgeUrl}
                onChange={(e) => setCloudCfg({ ...cloudCfg, bridgeUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/.../exec"
                style={{ padding: 10, borderRadius: 10 }}
              />
            </label>
            <div>
              <button type="submit" className="button button-primary" disabled={bridgeBusy}>
                {bridgeBusy ? 'جاري فحص الاتصال…' : 'حفظ واختبار الاتصال'}
              </button>
            </div>
          </form>
        </section>
      )}

      {tab === 'tickets' && (
        <AdminSupportTickets
          user={user}
          tickets={data?.tickets || []}
          onRefresh={refresh}
        />
      )}

      {tab === 'users' && (
        <AdminUsers
          user={user}
          users={data?.users || []}
          pendingInvites={pendingInvites}
          inviteEmail={inviteEmail}
          inviteBusy={inviteBusy}
          roleBusy={roleBusy}
          deleteBusy={deleteBusy}
          banBusy={banBusy}
          resetBusy={resetBusy}
          onInviteEmailChange={(event) => setInviteEmail(event.target.value)}
          onAddAdmin={addAdmin}
          onRevokeInvite={revokeInvite}
          onChangeRole={changeRole}
          onResetPassword={resetPassword}
          onChangeBan={changeBan}
          onRemoveUser={removeUser}
        />
      )}

      {tab === 'security' && <AdminSecurity bannedUsers={bannedUsers} loginLog={data?.loginLog} visits={data?.securityVisits} visitSummary={data?.securityVisitSummary} securityEvents={data?.securityEvents} />}
      {tab === 'owner-log' && user?.isOwner && <AdminOwnerLog accounts={accountLog} />}
      {tab === 'api' && <AdminApiUsage requests={data?.apiUsage} />}
      {tab === 'errors' && <AdminErrors errors={data?.errors} />}
      {tab === 'feedback' && <AdminFeedback feedback={data?.feedback} />}
    </main>
  );
}
