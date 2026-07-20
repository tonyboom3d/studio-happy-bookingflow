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

/** Find locked sketch status for a participant / organizer group from local selections. */
export function findLockedInGroup(selections, { participantId, participantName, rugIndexes } = {}) {
  const normalizedName = (participantName || '').trim();
  const rugSet = new Set((rugIndexes || []).filter((i) => i != null));
  const locked = (selections || []).find((s) => {
    const inGroup = (participantId && s.participantId === participantId)
      || (normalizedName && s.participantName === normalizedName)
      || (rugSet.size > 0 && rugSet.has(s.rugIndex));
    return inGroup && isLockedStatus(s.sketchStatus);
  });
  return locked ? normalizeSketchStatus(locked.sketchStatus) : null;
}

export function groupDeletableCacheKey(opts = {}) {
  const { participantId, orderId, participantName, rugIndexes } = opts;
  if (participantId) return `p:${participantId}`;
  const rugs = (rugIndexes || []).filter((i) => i != null).sort((a, b) => a - b).join(',');
  return `o:${orderId || ''}:${(participantName || '').trim()}:${rugs}`;
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
