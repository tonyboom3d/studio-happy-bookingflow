import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

/** True when URL contains test=true (search or hash query, e.g. #/order?test=true). */
export function isAiTestModeEnabled() {
  if (typeof window === 'undefined') return false;
  const hasTest = (params) => params.get('test') === 'true';
  if (hasTest(new URLSearchParams(window.location.search))) return true;
  const hash = window.location.hash || '';
  const qIdx = hash.indexOf('?');
  if (qIdx >= 0) return hasTest(new URLSearchParams(hash.slice(qIdx + 1)));
  return false;
}
