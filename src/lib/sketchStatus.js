/**
 * Frontend mirror of backend/sketchStatus.js — kept in sync manually since
 * the React app and Velo backend are separate bundles.
 */

export const SKETCH_STATUS = {
  OPEN: 'פתוח לשינויים',
  PREPARING: 'בהכנה',
  READY: 'מוכנה',
  REJECTED: 'לא מאושרת לביצוע',
};

const LEGACY_MAP = {
  Changeable: SKETCH_STATUS.OPEN,
  'סקיצה מוכנה': SKETCH_STATUS.READY,
  'In preparation': SKETCH_STATUS.PREPARING,
  'סקיצה בהכנה': SKETCH_STATUS.PREPARING,
};

export function normalizeSketchStatus(status) {
  if (!status) return SKETCH_STATUS.OPEN;
  if (LEGACY_MAP[status]) return LEGACY_MAP[status];
  if (Object.values(SKETCH_STATUS).includes(status)) return status;
  return SKETCH_STATUS.OPEN;
}

/** Statuses where staff already owns the sketch — selection mode can no longer change. */
export function isLockedStatus(status) {
  const normalized = normalizeSketchStatus(status);
  return normalized === SKETCH_STATUS.READY || normalized === SKETCH_STATUS.PREPARING;
}

/** True if any selection in the list is locked (בהכנה / מוכנה). */
export function hasLockedSelection(selections) {
  return (selections || []).some((sel) => isLockedStatus(sel?.sketchStatus));
}

export function getSketchStatusLabel(status) {
  const normalized = normalizeSketchStatus(status);
  if (normalized === SKETCH_STATUS.READY) return 'מוכנה';
  if (normalized === SKETCH_STATUS.PREPARING) return 'בהכנה';
  if (normalized === SKETCH_STATUS.REJECTED) return 'לא מאושרת';
  return 'ניתן לשינוי';
}

export function getSketchStatusShortLabel(status) {
  const normalized = normalizeSketchStatus(status);
  if (normalized === SKETCH_STATUS.READY) return 'סקיצה מוכנה';
  if (normalized === SKETCH_STATUS.PREPARING) return 'סקיצה בהכנה';
  if (normalized === SKETCH_STATUS.REJECTED) return 'לא מאושרת לביצוע';
  return null;
}

export function getSketchStatusBadgeStyle(status) {
  const normalized = normalizeSketchStatus(status);
  if (normalized === SKETCH_STATUS.READY) return { bg: 'bg-green-100', text: 'text-green-700' };
  if (normalized === SKETCH_STATUS.PREPARING) return { bg: 'bg-blue-100', text: 'text-blue-700' };
  if (normalized === SKETCH_STATUS.REJECTED) return { bg: 'bg-red-100', text: 'text-red-700' };
  return { bg: 'bg-[#f5f0fa]', text: 'text-[#5E2F88]' };
}

export function isEditableSketchStatus(status) {
  const normalized = normalizeSketchStatus(status);
  return normalized === SKETCH_STATUS.OPEN;
}
