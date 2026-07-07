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

const CATALOG_CACHE_KEY = 'studio_happy_catalog_v1';

export function readCatalogCache() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CATALOG_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeCatalogCache(products) {
  if (typeof window === 'undefined' || !products?.length) return;
  try {
    sessionStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(products));
  } catch {}
}

export function getDifficultyLabel(product) {
  const raw = product?.difficulty;
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw[0] || '';
  return '';
}

export function getDifficultyTextClass(label) {
  if (!label) return 'text-[#464646]/70';
  const l = label.toLowerCase().trim();
  if (l === 'קל' || l === 'easy') return 'text-green-600';
  if (l === 'בינוני' || l === 'medium') return 'text-orange-500';
  if (l === 'קשה' || l === 'hard' || l === 'מאתגר') return 'text-red-600';
  return 'text-[#464646]/70';
}

export function isHardDifficulty(label) {
  if (!label) return false;
  const l = label.toLowerCase();
  return l === 'קשה' || l === 'hard' || l === 'מאתגר';
}
