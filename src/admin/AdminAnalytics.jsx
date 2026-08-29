import { Activity, Ban, Bot, BriefcaseBusiness, GraduationCap, MessageSquareText, Sparkles, Users } from 'lucide-react';
import { Metric } from './AdminShared.jsx';

export default function AdminAnalytics({ data, percentages, bannedCount }) {
  return (
    <>
      <section className="admin-metrics">
        <Metric icon={Users} label="Total users" value={data?.summary?.totalUsers ?? '—'} hint={`${data?.summary?.activeToday ?? 0} active today`} />
        <Metric icon={MessageSquareText} label="AI requests" value={data?.summary?.aiRequests ?? '—'} hint={`${data?.summary?.aiSuccessRate ?? 0}% success rate`} />
        <Metric icon={Activity} label="Tracked usage" value={data?.summary?.totalUsage ?? '—'} hint="Real tool requests" />
        <Metric icon={Ban} label="Banned" value={bannedCount} hint="Owner-controlled account bans" />
      </section>
      <section className="admin-grid">
        <article className="usage-card"><div><Sparkles /><span><strong>General</strong><small>{percentages.general}% of usage</small></span></div><i><b style={{ width: `${percentages.general}%` }} /></i></article>
        <article className="usage-card"><div><GraduationCap /><span><strong>Study</strong><small>{percentages.study}% of usage</small></span></div><i><b style={{ width: `${percentages.study}%` }} /></i></article>
        <article className="usage-card"><div><BriefcaseBusiness /><span><strong>Work</strong><small>{percentages.work}% of usage</small></span></div><i><b style={{ width: `${percentages.work}%` }} /></i></article>
        <article className="usage-card health"><div><Bot /><span><strong>Platform health</strong><small>{data?.status?.apiOnline ? 'AI and database are ready' : 'Database ready · AI waiting for key'}</small></span></div></article>
      </section>
    </>
  );
}
