import {Icon} from './ui/icon';

export function MessageDelivery({state}:{state:'sending'|'saved'|'seen'|'failed'}) {
 const label={sending:'Sending',saved:'Saved',seen:'Seen',failed:'Not saved'}[state];
 return <span className={`message-delivery message-delivery--${state}`} title={label} aria-label={label}>
  {state==='sending'?<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/></svg>:state==='failed'?<Icon name="warning"/>:<svg viewBox="0 0 24 20" aria-hidden="true"><path d="m2 10 4 4L16 4"/>{state==='seen'&&<path d="m11 13 2 2L23 5"/>}</svg>}
  <span className="sr-only">{label}</span>
 </span>;
}

export function TypingBubble({name}:{name:string}) {
 return <div className="message-turn typing-turn" role="status"><span className="sr-only">{name} is typing</span><div className="typing-bubble" aria-hidden="true"><span/><span/><span/></div><span className="caption muted" aria-hidden="true">{name} is typing…</span></div>;
}
