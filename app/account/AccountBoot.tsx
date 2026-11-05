'use client';
import { useEffect } from 'react';
export default function AccountBoot(){useEffect(()=>{let cancelled=false;const icons=document.createElement('script'),script=document.createElement('script');icons.src='/icons.js';script.src='/account.js';icons.onload=()=>{if(!cancelled)document.body.appendChild(script)};document.body.appendChild(icons);return()=>{cancelled=true;icons.remove();script.remove()}},[]);return null}
