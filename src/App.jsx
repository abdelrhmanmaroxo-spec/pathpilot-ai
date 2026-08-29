import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import AdminDashboard from './AdminDashboard.jsx';
import AuthDialog from './AuthDialog.jsx';
import Landing from './components/Landing.jsx';
import { Footer, Header, InstallDialog } from './components/AppChrome.jsx';
import Workspace from './Workspace.jsx';
import {
  clearHistory,
  loadHistory,
  loadPreferences,
  saveHistory,
  savePreferences,
} from './lib/storage.js';
import {
  getCurrentUser,
  logoutAccount,
  trackUsage,
} from './lib/platform.js';

function routeFromHash() {
  const route = window.location.hash.replace('#/', '').replace('#', '');
  return ['study', 'work', 'general', 'admin'].includes(route) ? route : null;
}

export default function App() {
  const [mode, setMode] = useState(routeFromHash);
  const [historyItems, setHistoryItems] = useState(loadHistory);
  const [preferences, setPreferences] = useState(loadPreferences);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches);
  const [online, setOnline] = useState(navigator.onLine);
  const [toast, setToast] = useState('');
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    const updateRoute = () => setMode(routeFromHash());
    const updateOnline = () => setOnline(navigator.onLine);
    const captureInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const markInstalled = () => { setInstalled(true); setInstallPrompt(null); };
    window.addEventListener('hashchange', updateRoute);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    window.addEventListener('beforeinstallprompt', captureInstall);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      window.removeEventListener('hashchange', updateRoute);
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      window.removeEventListener('beforeinstallprompt', captureInstall);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, []);

  useEffect(() => {
    let active = true;
    getCurrentUser().then((currentUser) => {
      if (active) setUser(currentUser);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectMode = (nextMode) => {
    window.location.hash = `/${nextMode}`;
    trackUsage({ eventType: 'workspace_opened', workspace: nextMode });
  };

  const handleInstall = async () => {
    if (!installPrompt) {
      setInstallOpen(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      setInstallOpen(false);
    }
    setInstallPrompt(null);
  };

  const updatePreferences = (nextPreferences) => {
    const saved = savePreferences(nextPreferences);
    setPreferences(saved);
  };

  const handleAuthenticated = (authenticatedUser) => {
    setUser(authenticatedUser);
    if (!preferences.displayName && authenticatedUser?.name) {
      updatePreferences({ ...preferences, displayName: authenticatedUser.name });
    }
    setToast(`أهلًا ${authenticatedUser.name}.`);
  };

  const handleLogout = async () => {
    await logoutAccount();
    setUser(null);
    if (mode === 'admin') window.location.hash = '';
    setToast('تم تسجيل الخروج.');
  };

  const addHistory = (item) => {
    setHistoryItems((items) => saveHistory([item, ...items]));
  };

  const handleClearHistory = () => {
    if (!window.confirm('مسح سجل النتائج المحفوظ على هذا الجهاز؟')) return;
    clearHistory();
    setHistoryItems([]);
    setToast('تم مسح السجل.');
  };

  return (
    <div className="app">
      <Header mode={mode} onInstall={() => setInstallOpen(true)} installed={installed} online={online} user={user} onAccount={() => setAuthOpen(true)} onLogout={handleLogout} />
      {!mode ? (
        <Landing onSelect={selectMode} onInstall={() => setInstallOpen(true)} />
      ) : mode === 'admin' ? (
        <AdminDashboard user={user} onBack={() => { window.location.hash = ''; }} />
      ) : (
        <Workspace
          mode={mode}
          history={historyItems}
          preferences={preferences}
          onPreferencesChange={updatePreferences}
          onNewHistory={addHistory}
          onClearHistory={handleClearHistory}
          notify={setToast}
          key={mode}
        />
      )}
      <Footer />
      <InstallDialog open={installOpen} onClose={() => setInstallOpen(false)} onInstall={handleInstall} canInstall={Boolean(installPrompt)} installed={installed} />
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} onAuthenticated={handleAuthenticated} />
      {toast && <div className="toast" role="status"><BadgeCheck size={18} /> {toast}</div>}
    </div>
  );
}
