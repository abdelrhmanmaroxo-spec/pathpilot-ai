import { BrainCircuit, ShieldCheck } from 'lucide-react';

export default function AIOrb({ live = false }) {
  return (
    <section className={live ? 'ai-core-card is-live' : 'ai-core-card'} aria-label={live ? 'PathPilot AI connected' : 'PathPilot local intelligence'}>
      <div className="ai-core-copy">
        <span>{live ? 'AI CONNECTION' : 'LOCAL INTELLIGENCE'}</span>
        <strong>{live ? 'PathPilot AI Online' : 'PathPilot Core Ready'}</strong>
        <small><i /> {live ? 'متصل ومحمي' : 'جاهز محليًا'}</small>
      </div>
      <div className="ai-orb-scene" aria-hidden="true">
        <div className="ai-orb-halo halo-a" />
        <div className="ai-orb-halo halo-b" />
        <div className="ai-orb-halo halo-c" />
        <div className="ai-orb-shell">
          <span className="orb-latitude latitude-one" />
          <span className="orb-latitude latitude-two" />
          <span className="orb-longitude longitude-one" />
          <span className="orb-longitude longitude-two" />
          <span className="orb-node node-one" />
          <span className="orb-node node-two" />
          <span className="orb-node node-three" />
          <span className="orb-node node-four" />
          <span className="orb-node node-five" />
          <span className="orb-center"><BrainCircuit size={27} /></span>
        </div>
        <div className="ai-orb-platform"><span /><span /><span /></div>
      </div>
      <div className="ai-core-trust"><ShieldCheck size={14} /> <span>{live ? 'Live AI + smart fallback' : 'On-device fallback'}</span></div>
    </section>
  );
}
