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
