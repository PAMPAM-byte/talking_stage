'use client';
import {useEffect} from 'react';
import {checkForInitiative} from '@/lib/chat/checkin-sync.mjs';
export function CheckinSync({conversation}:{conversation?:string}){useEffect(()=>{void checkForInitiative(conversation);},[conversation]);return null;}
