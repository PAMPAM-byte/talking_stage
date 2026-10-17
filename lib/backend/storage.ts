import 'server-only';
import { trustedBackendClient } from './trusted-client';
export const castBucket = 'cast-private';
export function trustedStorage() {
  return trustedBackendClient();
}
