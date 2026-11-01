import { ArrowUpRight, MapPin, ScanLine } from "lucide-react";

export function SiteHeader() {
  return <header className="site-header">
    <div className="site-width header-inner">
      <a href="/" className="wordmark" aria-label="FoundIt home"><span className="brand-icon"><ScanLine size={23} /></span>foundit<span className="brand-period">.</span></a>
      <span className="event-label"><MapPin size={15} /> Hackathon help desk</span>
      <nav aria-label="Main navigation"><a href="/report/lost">I lost something</a><a className="nav-found" href="/report/found">I found something <ArrowUpRight size={15} /></a></nav>
    </div>
  </header>;
}
