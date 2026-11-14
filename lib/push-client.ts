// Browser-side push helpers (14 Nov 2026). iPhones only allow web push once the site is added
// to the Home Screen (iOS 16.4+), so they get guidance instead of a prompt until then.
import { deletePushSubscriptionAction, pushPublicKeyAction, savePushSubscriptionAction } from './backend/notification-actions';

export type PushSupport = 'supported' | 'needs-home-screen' | 'unsupported';
export function pushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return 'needs-home-screen';
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window ? 'supported' : 'unsupported';
}
export const permission = () => (typeof Notification === 'undefined' ? 'default' : Notification.permission);

function keyBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - base64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}
async function registration() { return navigator.serviceWorker.register('/sw.js', { scope: '/' }); }

export async function currentSubscription() {
  if (pushSupport() !== 'supported') return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return reg ? reg.pushManager.getSubscription() : null;
}

/** Asks permission (must follow a tap), subscribes and saves this browser. */
export async function turnOnPush(): Promise<{ error?: string }> {
  if (pushSupport() !== 'supported') return { error: 'This browser can’t show notifications.' };
  const result = await Notification.requestPermission();
  if (result !== 'granted') return { error: result === 'denied' ? 'Notifications are blocked for TalkingStage in your browser settings.' : 'Notifications weren’t turned on.' };
  const key = await pushPublicKeyAction();
  if (!key) return { error: 'Notifications aren’t available yet. Try again later.' };
  try {
    const reg = await registration(); await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription() ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
    const json = sub.toJSON();
    return savePushSubscriptionAction({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' });
  } catch { return { error: 'Notifications couldn’t be turned on. Try again.' }; }
}
export async function turnOffPush() {
  const sub = await currentSubscription();
  if (!sub) return;
  await deletePushSubscriptionAction(sub.endpoint);
  await sub.unsubscribe().catch(() => undefined);
}
