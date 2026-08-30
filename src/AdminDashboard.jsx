import { hasPlatformBackend } from './lib/platform.js';
import AdminDashboardView from './admin/AdminDashboardView.jsx';
import { EmptyAdmin } from './admin/AdminShared.jsx';
import { useAdminDashboardController } from './admin/useAdminDashboardController.js';

export default function AdminDashboard({ user, onBack }) {
  const controller = useAdminDashboardController(user);

  if (!hasPlatformBackend) return <main className="admin-page page-shell"><EmptyAdmin>لوحة الإدارة تحتاج Backend متصل.</EmptyAdmin></main>;
  if (user?.role !== 'admin') return <main className="admin-page page-shell"><EmptyAdmin>هذه الصفحة متاحة للـAdmin والـOwner فقط.</EmptyAdmin></main>;

  return <AdminDashboardView user={user} onBack={onBack} controller={controller} />;
}
