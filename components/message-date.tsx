'use client';
import {useEffect, useState} from 'react';
import {messageDay, messageDateLabel} from '@/lib/chat/message-dates';
import styles from './message-date.module.css';

export function MessageDate({timestamp, previous, now}: {timestamp: string; previous?: string; now: string}) {
    const [clock, setClock] = useState(now);
    const startsDay = !!messageDay(timestamp) && messageDay(timestamp) !== messageDay(previous);
    useEffect(() => {
        if (!startsDay) return;
        const update = () => setClock(new Date().toISOString());
        update();
        const timer = setInterval(update, 60000);
        return () => clearInterval(timer);
    }, [startsDay]);
    if (!startsDay) return null;
    const label = messageDateLabel(timestamp, clock);
    return <div className={styles.separator}><time dateTime={messageDay(timestamp)!} aria-label={new Intl.DateTimeFormat('en-NG', {timeZone:'Africa/Lagos',dateStyle:'full'}).format(new Date(timestamp))}>{label}</time></div>;
}
