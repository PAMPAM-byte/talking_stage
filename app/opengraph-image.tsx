import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// The card shown when a TalkingStage link is shared on X, WhatsApp and similar apps.
export const alt = 'TalkingStage: a little banter, a little chemistry. Two smiling fictional AI characters.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  // Manrope is a variable font, which the image renderer cannot read, so the card is set in DM Serif.
  const [display, photo] = await Promise.all([
    readFile(join(process.cwd(), 'app/fonts/DMSerifDisplay.ttf')),
    readFile(join(process.cwd(), 'public/images/landing-characters.png')),
  ]);
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#ffffff', color: '#242126' }}>
      <div style={{ width: 600, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '56px 48px 48px 64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, fontWeight: 700 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: '#cf2445', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Serif Display', fontSize: 34 }}>“</div>
          TalkingStage
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 22, color: '#cf2445', fontWeight: 700, marginBottom: 18 }}>♥ AI dating. Nigerian personality.</div>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: 60, lineHeight: 1.05, display: 'flex', flexDirection: 'column' }}>
            <span>A little banter.</span>
            <span>A little <span style={{ color: '#cf2445', marginLeft: 16 }}>chemistry.</span></span>
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 22, color: '#6c666e' }}>talkingstage.buzz · Free to chat · 18+</div>
      </div>
      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${photo.toString('base64')}`} width={600} height={630} style={{ objectFit: 'cover' }} alt="" />
        <div style={{ position: 'absolute', bottom: 20, right: 24, fontSize: 16, color: '#ffffff', background: 'rgba(36,33,38,0.55)', padding: '6px 12px', borderRadius: 999 }}>Fictional AI characters · AI-generated photos</div>
      </div>
    </div>,
    { ...size, fonts: [{ name: 'DM Serif Display', data: display, weight: 400, style: 'normal' }] },
  );
}
