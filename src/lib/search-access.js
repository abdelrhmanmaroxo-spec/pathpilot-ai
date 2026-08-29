export function canAccessAdminSearch(user) {
  return Boolean(user && (user.role === 'admin' || user.isOwner === true));
}

export function filterSearchHistory(history = [], user) {
  const allowAdmin = canAccessAdminSearch(user);
  return history.filter((item) => allowAdmin || item?.mode !== 'admin');
}
