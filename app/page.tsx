import { ArrowRight, ArrowUpRight, Check, ClipboardCheck, HandHeart, LockKeyhole, MapPin, Search, Ticket } from "lucide-react";

export default function Home() {
  return <main id="main-content">
    <section className="site-width home-hero">
      <div className="hero-copy">
        <p className="context-line"><span className="small-blue-dot" /> A little help getting back to your day</p>
        <h1>Left something<br />behind?</h1>
        <p className="hero-description">A bag by your seat. Keys at registration. Start here to help something lost find its way back.</p>
        <div className="hero-actions"><a href="/report/lost" className="button button-primary">Find my item <ArrowRight size={18} /></a><a href="/report/found" className="text-action">I found something <ArrowUpRight size={17} /></a></div>
        <p className="hero-footnote"><LockKeyhole size={15} /> Identifying clues belong in a private check.</p>
      </div>
      <div className="ticket-visual" aria-label="The four steps of recovery">
        <div className="ticket-top"><span className="ticket-brand"><Ticket size={18} /> A way back</span><span className="ticket-event">FoundIt help desk</span></div>
        <div className="ticket-content"><span className="ticket-intro">Every return starts with a report.</span><h2>Small clues.<br />A clearer next step.</h2>
          <ol className="ticket-steps">{[
            ["01", "Describe it", "Share the details you remember."],
            ["02", "Compare clues", "Look at possible matches."],
            ["03", "Verify privately", "Help staff check ownership."],
            ["04", "Collect it", "Confirm the handover in person."],
          ].map(([number,title,detail])=><li key={number}><span className="step-number">{number}</span><div><strong>{title}</strong><p>{detail}</p></div><Check size={16} aria-hidden="true" /></li>)}</ol>
        </div><div className="ticket-bottom"><span className="ticket-barcode" aria-hidden="true" /><span>From missing to back in your hands.</span></div>
      </div>
    </section>
    <section className="site-width action-section" aria-labelledby="start-title">
      <div className="section-heading"><div><p className="section-kicker">Where should we start?</p><h2 id="start-title">Two ways to make someone’s day.</h2></div><span className="section-note">Choose the report that fits.</span></div>
      <div className="action-grid"><a href="/report/lost" className="action-panel lost-panel"><span className="panel-icon"><Search size={24}/></span><div><h3>I’m looking for something.</h3><p>Tell us what went missing, where you last saw it, and what makes it yours.</p><span className="panel-link">Start a lost report <ArrowRight size={18}/></span></div></a><a href="/report/found" className="action-panel found-panel"><span className="panel-icon"><HandHeart size={25}/></span><div><h3>I’d like to return something.</h3><p>Record a found item and keep one identifying clue for a private ownership check.</p><span className="panel-link">Start a found report <ArrowRight size={18}/></span></div></a></div>
    </section>
    <section className="site-width principles" aria-label="How recovery is handled"><div><MapPin size={21}/><h3>Start with the place.</h3><p>A rough location and time help narrow things down.</p></div><div><LockKeyhole size={21}/><h3>Keep one clue private.</h3><p>Leave serial numbers and hidden details out of public descriptions.</p></div><div><ClipboardCheck size={21}/><h3>Finish with a handover.</h3><p>Finding a candidate is the first step. Staff still need to check ownership.</p></div></section>
    <div className="site-width development-note"><span className="development-label">Frontend preview</span><p>You can prepare and review a report. Submission and matching will become available when the service is connected.</p></div>
  </main>;
}
