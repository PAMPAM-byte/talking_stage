'use client';

import { useEffect } from 'react';

/** Progressive enhancement: server-rendered content remains visible without JS. */
export function LandingMotion() {
  useEffect(() => {
    const site = document.querySelector<HTMLElement>('.tsl-site');
    if (!site) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let stop = () => {};

    const configure = () => {
      stop();
      if (preference.matches) return;
      const animations = new Set<Animation>();
      const targets = site.querySelectorAll<HTMLElement>([
        '.tsl-heroCopy > *', '.tsl-heroVisual', '.tsl-assurances > span',
        '.tsl-sectionHeading', '.tsl-steps > li', '.tsl-splitHeading > div',
        '.tsl-personality', '.tsl-conversationVisual', '.tsl-featureCopy',
        '.tsl-controls > article', '.tsl-faqIntro', '.tsl-faqList', '.tsl-finalCard',
      ].join(','));
      const observer = new IntersectionObserver(entries => {
        const visible = entries.filter(entry => entry.isIntersecting);
        visible.forEach((entry, index) => {
          const element = entry.target as HTMLElement;
          observer.unobserve(element);
          // Keyboard users should never have to wait for a focused control.
          if (element.contains(document.activeElement)) return;
          const animation = element.animate([
            { opacity: 0.18, transform: 'translateY(22px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ], { duration: 680, delay: Math.min(index * 65, 260), easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'backwards' });
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        });
      }, { threshold: 0.08 });
      targets.forEach(target => observer.observe(target));

      const layers = [
        { element: site.querySelector<HTMLElement>('.tsl-heroVisual'), variable: '--tsl-depth', distance: 28 },
        { element: site.querySelector<HTMLElement>('.tsl-conversationVisual'), variable: '--tsl-chat-depth', distance: 16 },
      ];
      let frame = 0;
      const update = () => {
        frame = 0;
        layers.forEach(({ element, variable, distance }) => {
          if (!element) return;
          const rect = element.getBoundingClientRect();
          if (rect.bottom < -80 || rect.top > innerHeight + 80) return;
          const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - rect.top - rect.height / 2) / (innerHeight / 2 + rect.height / 2)));
          const mobileScale = innerWidth < 700 ? 0.5 : 1;
          element.style.setProperty(variable, `${(progress * distance * mobileScale).toFixed(2)}px`);
        });
      };
      const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
      const focus = (event: FocusEvent) => {
        const element = event.target as HTMLElement;
        animations.forEach(animation => {
          const target = (animation.effect as KeyframeEffect | null)?.target;
          if (target instanceof Element && target.contains(element)) {
            animation.cancel(); animations.delete(animation);
          }
        });
      };
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      site.addEventListener('focusin', focus);
      schedule();
      stop = () => {
        observer.disconnect();
        animations.forEach(animation => animation.cancel());
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        site.removeEventListener('focusin', focus);
        layers.forEach(({ element, variable }) => element?.style.removeProperty(variable));
      };
    };
    configure();
    preference.addEventListener('change', configure);
    return () => { stop(); preference.removeEventListener('change', configure); };
  }, []);
  return null;
}
