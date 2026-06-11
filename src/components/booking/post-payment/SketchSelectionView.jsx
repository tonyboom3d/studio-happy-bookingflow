import React, { useState, useMemo, useCallback } from 'react';
import { Check, LayoutGrid, Loader2, RefreshCw, ChevronDown, Clock, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmationModal from './ConfirmationModal';
import SketchCatalogSheet from './SketchCatalogSheet';

export default function SketchSelectionView({
  rugSlots,
  catalog,
  workshopStart,
  deadlineAt,
  totalRugCount,
  onSelectSketch,
  onRequestUpgrade,
  onFetchCatalog,
  existingSelections = [],
  isReadOnly = false,
}) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogForSlot, setCatalogForSlot] = useState(null);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pendingUpgrades, setPendingUpgrades] = useState({});
  const [participantNames, setParticipantNames] = useState({});
  const [deadlineError, setDeadlineError] = useState(false);

  const requireName = (totalRugCount || rugSlots.length) > 2;
  const isExpired = deadlineAt && new Date(deadlineAt) < new Date();

  const selectionsMap = useMemo(() => {
    const map = {};
    existingSelections.forEach((s) => { map[s.rugIndex] = s; });
    return map;
  }, [existingSelections]);

  const daysUntilWorkshop = useMemo(() => {
    if (!workshopStart) return 999;
    return (new Date(workshopStart).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  }, [workshopStart]);

  const openCatalogForSlot = useCallback(async (slotIndex) => {
    if (isReadOnly) return;
    if (isExpired) { setDeadlineError(true); return; }
    setCatalogForSlot(slotIndex);
    if (!catalog?.length && onFetchCatalog) {
      setCatalogLoading(true);
      try { await onFetchCatalog(); } finally { setCatalogLoading(false); }
    }
    setCatalogOpen(true);
  }, [catalog, onFetchCatalog, isReadOnly, isExpired]);

  const handleSketchPick = useCallback((product) => {
    if (isExpired) { setDeadlineError(true); return; }
    setPendingProduct({ ...product, rugIndex: catalogForSlot });
    setCatalogOpen(false);
    setShowModal(true);
  }, [catalogForSlot, isExpired]);

  const handleModalConfirm = useCallback((size, participantName) => {
    if (isExpired) { setDeadlineError(true); setShowModal(false); return; }

    const selection = {
      rugIndex: pendingProduct.rugIndex,
      productId: pendingProduct._id,
      productSnapshot: { title: pendingProduct.title, image: pendingProduct.image, difficulty: pendingProduct.difficulty },
      canvasSize: size,
      title: pendingProduct.title,
      participantName: participantName || null,
    };

    if (participantName) {
      setParticipantNames(prev => ({ ...prev, [pendingProduct.rugIndex]: participantName }));
    }

    if (size === '90x90') {
      setPendingUpgrades(prev => ({ ...prev, [pendingProduct.rugIndex]: selection }));
    } else {
      onSelectSketch(selection);
    }

    setShowModal(false);
    setPendingProduct(null);
  }, [pendingProduct, isExpired, onSelectSketch]);

  const handlePayAndSave = useCallback(() => {
    if (isExpired) { setDeadlineError(true); return; }
    const upgrades = Object.values(pendingUpgrades);
    upgrades.forEach(sel => onSelectSketch(sel));
    setPendingUpgrades({});
  }, [pendingUpgrades, isExpired, onSelectSketch]);

  const visibleSlots = expanded ? rugSlots : rugSlots.slice(0, 4);
  const hasHiddenSlots = rugSlots.length > 4 && !expanded;
  const pendingUpgradeCount = Object.keys(pendingUpgrades).length;
  const slotLabel = catalogForSlot != null
    ? (rugSlots.length > 1 ? `בחירת עיצוב לשטיח ${catalogForSlot + 1}` : 'בחירת עיצוב לשטיח')
    : 'בחירת עיצוב';

  return (
    <div className="py-3 space-y-2.5" dir="rtl">
      <AnimatePresence>
        {deadlineError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">המועד האחרון לשינויים חלף. לא ניתן לעדכן את הבחירה.</p>
            <button type="button" onClick={() => setDeadlineError(false)} className="text-red-400 hover:text-red-600 mr-auto text-xs">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {catalogLoading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-[#5E2F88]">
          <Loader2 className="w-4 h-4 animate-spin" />
          טוען קטלוג...
        </div>
      )}

      <div className="space-y-2.5 relative">
        {visibleSlots.map((slot) => {
          const sel = selectionsMap[slot.rugIndex];
          const pending = pendingUpgrades[slot.rugIndex];
          const display = sel || pending;
          const name = participantNames[slot.rugIndex] || slot.participantName;
          const isLocked = sel && (
            sel.selectionStatus === 'preparing' || sel.selectionStatus === 'ready' ||
            (daysUntilWorkshop < 7 && sel.confirmedAt) || sel.upgradePaymentStatus === 'paid'
          );

          return (
            <div
              key={slot.rugIndex}
              className={`bg-white rounded-xl border-2 p-3.5 transition-all ${
                sel ? 'border-[#5E2F88]/30' : pending ? 'border-orange-300' : 'border-[#e8e8e8] hover:border-[#5E2F88]/40 cursor-pointer'
              }`}
              onClick={!display && !isLocked ? () => openCatalogForSlot(slot.rugIndex) : undefined}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    sel ? 'bg-green-100 text-green-700' : pending ? 'bg-orange-100 text-orange-700' : 'bg-[#f5f0fa] text-[#5E2F88]'
                  }`}>
                    {sel ? <Check className="w-3.5 h-3.5" /> : slot.rugIndex + 1}
                  </div>
                  <div>
                    <span className="text-[15px] font-semibold text-[#581E83]">שטיח {slot.rugIndex + 1}</span>
                    {name && <span className="text-[13px] text-[#464646]/60 mr-1.5">· {name}</span>}
                  </div>
                </div>

                {isLocked && (
                  <span className="text-[11px] font-bold bg-[#5E2F88] text-white px-2.5 py-1 rounded-full">נעול</span>
                )}
                {sel && !isLocked && (
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    sel.selectionStatus === 'preparing' ? 'bg-blue-100 text-blue-700' :
                    sel.selectionStatus === 'ready' ? 'bg-green-100 text-green-700' :
                    'bg-[#f5f0fa] text-[#5E2F88]'
                  }`}>
                    {sel.selectionStatus === 'preparing' ? 'בהכנה' :
                     sel.selectionStatus === 'ready' ? 'סקיצה מוכנה' : 'ניתן לשינוי'}
                  </span>
                )}
                {pending && (
                  <span className="text-[11px] font-bold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />ממתין לתשלום
                  </span>
                )}
              </div>

              {display && (
                <div className="flex items-center gap-3 bg-[#fafafa] rounded-lg p-2.5 mt-1.5">
                  {(display.productSnapshot?.image) && (
                    <img src={display.productSnapshot.image} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#581E83] truncate">
                      {display.productSnapshot?.title || display.title || 'סקיצה'}
                    </p>
                    <p className="text-xs text-[#464646]/60 mt-0.5">
                      גודל: {display.canvasSize}
                      {(display.canvasSize === '90x90' && pending) && <span className="text-orange-600 font-medium"> · ₪90 תוספת</span>}
                    </p>
                  </div>
                  {!isLocked && !isReadOnly && !isExpired && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openCatalogForSlot(slot.rugIndex); }}
                      className="flex items-center gap-1 text-xs text-[#5E2F88] hover:text-[#7B3DB0] font-medium bg-white border border-[#5E2F88]/20 rounded-lg px-2.5 py-1.5 transition-colors shrink-0"
                    >
                      <RefreshCw className="w-3 h-3" />
                      החלפה
                    </button>
                  )}
                </div>
              )}

              {!display && (
                <div className="flex items-center gap-2 text-[#464646]/50 py-1.5">
                  <LayoutGrid className="w-5 h-5 text-[#5E2F88]/30" />
                  <span className="text-sm">לחצו לבחירת עיצוב</span>
                </div>
              )}

              {pending && (
                <p className="text-[11px] text-orange-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  הבחירה לא נשמרה עדיין — ממתין להשלמת תשלום
                </p>
              )}
            </div>
          );
        })}

        {hasHiddenSlots && (
          <div className="relative">
            <div className="absolute inset-x-0 -top-16 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-[#5E2F88] hover:text-[#7B3DB0] transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
              הצג עוד {rugSlots.length - 4} שטיחים
            </button>
          </div>
        )}

        {expanded && rugSlots.length > 4 && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-[#464646]/60 hover:text-[#5E2F88] transition-colors"
          >
            <ChevronDown className="w-4 h-4 rotate-180" />
            הצג פחות
          </button>
        )}
      </div>

      {pendingUpgradeCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-orange-800">
              {pendingUpgradeCount} {pendingUpgradeCount === 1 ? 'שטיח' : 'שטיחים'} בגודל 90×90 ממתינים לתשלום
            </span>
            <span className="text-sm font-bold text-orange-800">₪{pendingUpgradeCount * 90}</span>
          </div>
          <Button type="button" onClick={handlePayAndSave} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium">
            <CreditCard className="w-4 h-4 ml-2" />
            תשלום ושמירת שינויים
          </Button>
        </div>
      )}

      <SketchCatalogSheet
        isOpen={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        catalog={catalog}
        selectedProductId={selectionsMap[catalogForSlot]?.productId}
        onPick={handleSketchPick}
        slotLabel={slotLabel}
        readOnly={isReadOnly}
      />

      <ConfirmationModal
        open={showModal}
        onClose={() => { setShowModal(false); setPendingProduct(null); }}
        onConfirm={handleModalConfirm}
        sketchTitle={pendingProduct?.title || ''}
        deadlineAt={deadlineAt}
        requireName={requireName}
        existingName={participantNames[pendingProduct?.rugIndex] || ''}
        daysUntilWorkshop={daysUntilWorkshop}
      />
    </div>
  );
}
