import React, { useState, useMemo } from 'react';
import { Check, Sparkles, LayoutGrid, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmationModal from './ConfirmationModal';
import SketchCatalogSheet from './SketchCatalogSheet';

export default function SketchSelectionView({
  rugSlots,
  catalog,
  workshopStart,
  onSelectSketch,
  onRequestUpgrade,
  onFetchCatalog,
  existingSelections = [],
  isReadOnly = false,
}) {
  const [activeSlot, setActiveSlot] = useState(0);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const daysUntilWorkshop = useMemo(() => {
    if (!workshopStart) return 999;
    return (new Date(workshopStart) - Date.now()) / (1000 * 60 * 60 * 24);
  }, [workshopStart]);

  const selectionsMap = useMemo(() => {
    const map = {};
    existingSelections.forEach((s) => {
      map[s.rugIndex] = s;
    });
    return map;
  }, [existingSelections]);

  const currentSlot = rugSlots[activeSlot];
  const currentSelection = selectionsMap[currentSlot?.rugIndex];
  const isSlotLocked = currentSelection && (
    currentSelection.selectionStatus === 'preparing' ||
    currentSelection.selectionStatus === 'ready' ||
    (daysUntilWorkshop < 7 && currentSelection.confirmedAt) ||
    currentSelection.upgradePaymentStatus === 'paid'
  );

  const handleSketchPick = (product) => {
    if (isReadOnly || isSlotLocked) return;

    const needs90x90 = product.canvasSize === '90x90' || product.requires90x90Upgrade;

    setPendingSelection({
      rugIndex: currentSlot.rugIndex,
      productId: product._id,
      productSnapshot: { title: product.title, image: product.image, difficulty: product.difficulty },
      canvasSize: needs90x90 ? '90x90' : '60x60',
      title: product.title,
      needs90x90,
    });
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    if (!pendingSelection) return;
    if (pendingSelection.needs90x90) {
      onRequestUpgrade(pendingSelection);
    } else {
      onSelectSketch(pendingSelection);
    }
    setShowConfirmation(false);
    setPendingSelection(null);
  };

  const slotLabel = rugSlots.length > 1
    ? `בחירת עיצוב לשטיח ${currentSlot.rugIndex + 1}`
    : 'בחירת עיצוב לשטיח';

  return (
    <div className="py-4" dir="rtl">
      {rugSlots.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {rugSlots.map((slot, idx) => {
            const sel = selectionsMap[slot.rugIndex];
            const completed = !!sel;
            return (
              <button
                key={slot.rugIndex}
                type="button"
                onClick={() => setActiveSlot(idx)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeSlot === idx
                    ? 'bg-[#5E2F88] text-white'
                    : completed
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-[#f5f5f5] text-[#464646] border border-[#e8e8e8]'
                }`}
              >
                {completed && <Check className="w-3 h-3" />}
                שטיח {slot.rugIndex + 1}
                {slot.participantName && (
                  <span className="text-xs opacity-70">({slot.participantName})</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {currentSelection ? (
        <div className="bg-[#f5f0fa] rounded-xl p-4 mb-4 flex items-center gap-3">
          {currentSelection.productSnapshot?.image && (
            <img
              src={currentSelection.productSnapshot.image}
              alt=""
              className="w-16 h-16 rounded-lg object-cover shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#581E83]">
              {currentSelection.productSnapshot?.title || 'סקיצה שנבחרה'}
            </p>
            <p className="text-xs text-[#464646]/60 mt-0.5">
              {currentSelection.canvasSize} •{' '}
              {currentSelection.selectionStatus === 'preparing' ? 'בהכנה' :
               currentSelection.selectionStatus === 'ready' ? 'מוכנה' :
               isSlotLocked ? 'בחירה סופית' : 'ניתן לשינוי'}
            </p>
          </div>
          {isSlotLocked && (
            <span className="text-xs bg-[#5E2F88] text-white rounded-full px-2 py-0.5 shrink-0">נעול</span>
          )}
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-[#5E2F88]/30 rounded-xl p-6 mb-4 text-center">
          <LayoutGrid className="w-8 h-8 text-[#5E2F88]/40 mx-auto mb-2" />
          <p className="text-sm text-[#464646]/70">עדיין לא נבחר עיצוב {rugSlots.length > 1 ? `לשטיח ${currentSlot.rugIndex + 1}` : ''}</p>
        </div>
      )}

      <Button
        type="button"
        disabled={catalogLoading}
        onClick={async () => {
          if (!catalog?.length && onFetchCatalog) {
            setCatalogLoading(true);
            try { await onFetchCatalog(); } finally { setCatalogLoading(false); }
          }
          setCatalogOpen(true);
        }}
        className="w-full bg-[#5E2F88] hover:bg-[#7B3DB0] text-white py-3 text-base font-medium mb-4"
      >
        {catalogLoading ? (
          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
        ) : (
          <LayoutGrid className="w-4 h-4 ml-2" />
        )}
        {catalogLoading ? 'טוען קטלוג...' : isSlotLocked || isReadOnly ? 'צפייה בקטלוג העיצובים' : currentSelection ? 'שינוי עיצוב מהקטלוג' : 'פתיחת קטלוג העיצובים'}
      </Button>

      <SketchCatalogSheet
        isOpen={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        catalog={catalog}
        selectedProductId={currentSelection?.productId}
        onPick={handleSketchPick}
        slotLabel={slotLabel}
        readOnly={isReadOnly || isSlotLocked}
      />

      <div className="border-2 border-dashed border-[#e8e8e8] rounded-xl p-4 text-center opacity-60">
        <div className="flex items-center justify-center gap-2 text-sm text-[#464646]/70">
          <Sparkles className="w-4 h-4 text-[#5E2F88]" />
          <span>בקרוב: יצירת סקיצה בבינה מלאכותית</span>
        </div>
      </div>

      <ConfirmationModal
        open={showConfirmation}
        onClose={() => { setShowConfirmation(false); setPendingSelection(null); }}
        onConfirm={handleConfirm}
        sketchTitle={pendingSelection?.title || ''}
        canvasSize={pendingSelection?.canvasSize || '60x60'}
        daysUntilWorkshop={daysUntilWorkshop}
      />
    </div>
  );
}
