import React, { useState, useMemo } from 'react';
import { Check, ZoomIn, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ConfirmationModal from './ConfirmationModal';

function getDifficultyLabel(product) {
  const raw = product.difficulty;
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw[0] || '';
  return '';
}

export default function SketchSelectionView({
  rugSlots,
  catalog,
  workshopStart,
  onSelectSketch,
  onRequestUpgrade,
  existingSelections = [],
  isReadOnly = false,
}) {
  const [activeSlot, setActiveSlot] = useState(0);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const daysUntilWorkshop = useMemo(() => {
    if (!workshopStart) return 999;
    return (new Date(workshopStart) - Date.now()) / (1000 * 60 * 60 * 24);
  }, [workshopStart]);

  const selectionsMap = useMemo(() => {
    const map = {};
    existingSelections.forEach(s => {
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

  return (
    <div className="py-4" dir="rtl">
      {/* Rug slot tabs */}
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

      {/* Current selection status */}
      {currentSelection && (
        <div className="bg-[#f5f0fa] rounded-xl p-3 mb-4 flex items-center gap-3">
          {currentSelection.productSnapshot?.image && (
            <img
              src={currentSelection.productSnapshot.image}
              alt=""
              className="w-12 h-12 rounded-lg object-cover"
            />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-[#581E83]">
              {currentSelection.productSnapshot?.title || 'סקיצה שנבחרה'}
            </p>
            <p className="text-xs text-[#464646]/60">
              {currentSelection.canvasSize} •{' '}
              {currentSelection.selectionStatus === 'preparing' ? 'בהכנה' :
               currentSelection.selectionStatus === 'ready' ? 'מוכנה' :
               isSlotLocked ? 'בחירה סופית' : 'ניתן לשינוי'}
            </p>
          </div>
          {isSlotLocked && (
            <span className="text-xs bg-[#5E2F88] text-white rounded-full px-2 py-0.5">נעול</span>
          )}
        </div>
      )}

      {/* Catalog grid */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="font-medium text-[#581E83]">
            {isSlotLocked ? 'הקטלוג (לצפייה בלבד)' : 'בחרו סקיצה מהקטלוג'}
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(catalog || []).map(product => {
            const isSelected = currentSelection?.productId === product._id;
            const diffLabel = getDifficultyLabel(product);

            return (
              <motion.div
                key={product._id}
                whileTap={isSlotLocked ? {} : { scale: 0.98 }}
                className={`relative bg-white rounded-xl overflow-hidden border-2 transition-all ${
                  isSelected
                    ? 'border-[#5E2F88] shadow-lg'
                    : 'border-[#e8e8e8] hover:border-[#5E2F88]/50 hover:shadow-md'
                } ${isSlotLocked && !isSelected ? 'opacity-50' : ''}`}
              >
                {isSelected && (
                  <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full bg-[#5E2F88] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleSketchPick(product)}
                  disabled={isSlotLocked || isReadOnly}
                  className="w-full text-right disabled:cursor-not-allowed"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#E4C1F9]/20 flex items-center justify-center relative">
                    {product.image ? (
                      <>
                        <img
                          src={product.image}
                          alt={product.title}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setZoomedImage(product.image); }}
                          className="absolute bottom-1.5 left-1.5 rounded-full bg-white/80 p-1 hover:bg-white"
                        >
                          <ZoomIn className="h-3 w-3 text-[#581E83]" />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-[#464646]/40">אין תמונה</span>
                    )}
                  </div>
                  <div className="p-2">
                    <h3 className="font-medium text-[#581E83] text-xs leading-snug">{product.title}</h3>
                    {diffLabel && (
                      <span className="text-[10px] text-[#464646]/60">{diffLabel}</span>
                    )}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* AI / Custom placeholder */}
      <div className="border-2 border-dashed border-[#e8e8e8] rounded-xl p-4 text-center opacity-60">
        <div className="flex items-center justify-center gap-2 text-sm text-[#464646]/70">
          <Sparkles className="w-4 h-4 text-[#5E2F88]" />
          <span>בקרוב: יצירת סקיצה בבינה מלאכותית</span>
        </div>
      </div>

      {/* Zoom dialog */}
      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-lg p-2">
          {zoomedImage && (
            <img src={zoomedImage} alt="תקריב" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation modal */}
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
