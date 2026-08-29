export function Metric({ icon: Icon, label, value, hint }) {
  return <article className="admin-metric"><span><Icon /></span><div><small>{label}</small><strong>{value}</strong><p>{hint}</p></div></article>;
}

export function EmptyAdmin({ children }) {
  return <div className="admin-empty">{children}</div>;
}
