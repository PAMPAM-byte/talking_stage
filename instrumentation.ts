import type { Instrumentation } from 'next';
import { emit } from '@/lib/monitoring/events.mjs';

// Do not log errors, digests, URLs, headers, cookies or request bodies.
export const onRequestError: Instrumentation.onRequestError = (_error, _request, context) => {
  emit('server.request', 'unexpected', 0, context.routeType);
};
