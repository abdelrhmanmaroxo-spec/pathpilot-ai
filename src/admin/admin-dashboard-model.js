const BASE_ADMIN_TABS = Object.freeze([
  ['analytics', 'Analytics'],
  ['users', 'Users'],
  ['security', 'Security & Login Log'],
  ['api', 'API Usage'],
  ['errors', 'Errors'],
  ['feedback', 'Feedback'],
]);

const OWNER_TAB = Object.freeze(['owner-log', 'Owner Account Log']);
const USAGE_KEYS = Object.freeze(['general', 'study', 'work']);

export function getAdminTabs(isOwner = false) {
  return isOwner ? [...BASE_ADMIN_TABS, OWNER_TAB] : [...BASE_ADMIN_TABS];
}

export function getBannedUsers(users) {
  return Array.isArray(users) ? users.filter((item) => item?.disabled) : [];
}

export function getPendingAdminInvites(invites) {
  return Array.isArray(invites) ? invites.filter((item) => !item?.accepted_at) : [];
}

export function getAdminUsagePercentages(summary) {
  const usage = summary?.usage || {};
  const total = Number(summary?.totalUsage) || 0;
  return Object.fromEntries(USAGE_KEYS.map((key) => [
    key,
    total > 0 ? Math.round(((Number(usage[key]) || 0) / total) * 100) : 0,
  ]));
}
