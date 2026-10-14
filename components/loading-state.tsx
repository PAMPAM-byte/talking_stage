import { Skeleton } from './ui/primitives';

export function LoadingState({ label = 'Loading content' }: { label?: string }) {
  return <div className="stack" role="status" aria-busy="true"><span className="sr-only">{label}</span><div className="stack" aria-hidden="true"><Skeleton width="55%" height={32} /><Skeleton width="75%" height={18} /><Skeleton height={220} /><Skeleton width="85%" height={18} /></div></div>;
}
