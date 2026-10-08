"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconButton } from "./primitives";
export function Overlay({ open, onClose, title, description, children, footer, sheet = false }: { open: boolean; onClose: () => void; title: string; description?: string; children?: ReactNode; footer?: ReactNode; sheet?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null); const id = useId();
  useEffect(() => {
    const dialog = ref.current; if (!dialog) return;
    if (!open) { if (dialog.open) dialog.close(); return; }
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    return () => { if (dialog.open) dialog.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [open]);
  return <dialog ref={ref} className={`overlay${sheet ? " overlay--sheet" : ""}`} aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined} onCancel={(event) => { event.preventDefault(); onClose(); }}><div className="overlay__header"><h2 id={`${id}-title`}>{title}</h2><IconButton icon="close" label={`Close ${title.toLowerCase()}`} onClick={onClose} /></div>{description && <p className="muted supporting" id={`${id}-description`} style={{ marginBottom: 20 }}>{description}</p>}{children}{footer && <div className="overlay__footer">{footer}</div>}</dialog>;
}
