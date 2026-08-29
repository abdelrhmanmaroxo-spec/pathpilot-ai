export function canAccessExperimentalChat(user) {
  return Boolean(user && (user.role === 'admin' || user.isOwner === true));
}
