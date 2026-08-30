export function canModerateUser(actor, target) {
  if (!actor || actor.role !== 'admin' || !target || target.isOwner) return false;
  if (actor.isOwner) return true;
  return target.role === 'user';
}
