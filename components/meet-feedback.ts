/** Brief feedback for the user's Meet action; survives the route into chat. */
export function showMeetFeedback(origin?: DOMRect) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelector('[data-meet-feedback]')?.remove();
  const layer = document.createElement('div');
  layer.dataset.meetFeedback = 'true';
  layer.setAttribute('aria-hidden', 'true');
  Object.assign(layer.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '200', overflow: 'hidden' });
  const x = origin ? origin.left + origin.width / 2 : innerWidth / 2;
  const y = origin ? Math.min(origin.top + origin.height / 2, innerHeight - 48) : innerHeight * 0.65;
  for (let index = 0; index < 14; index++) {
    const heart = document.createElement('span');
    heart.textContent = '♥';
    const horizontal = ((index % 7) - 3) * 38;
    const rise = 100 + (index % 5) * 28;
    Object.assign(heart.style, { position: 'absolute', left: `${x}px`, top: `${y}px`, color: index % 3 ? '#cf2445' : '#e86b89', fontSize: `${18 + index % 4 * 5}px`, lineHeight: '1' });
    layer.appendChild(heart);
    heart.animate([
      { transform: 'translate(-50%, -50%) scale(.2)', opacity: 0 },
      { transform: `translate(calc(-50% + ${horizontal * .3}px), -45px) scale(1)`, opacity: .9, offset: .2 },
      { transform: `translate(calc(-50% + ${horizontal}px), -${rise}px) rotate(${horizontal / 5}deg) scale(.7)`, opacity: 0 },
    ], { duration: 1500, delay: index % 3 * 110, easing: 'cubic-bezier(.2,.65,.3,1)', fill: 'both' });
  }
  document.body.appendChild(layer);
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const remove = () => { layer.remove(); preference.removeEventListener('change', remove); };
  preference.addEventListener('change', remove);
  setTimeout(remove, 1900);
}
