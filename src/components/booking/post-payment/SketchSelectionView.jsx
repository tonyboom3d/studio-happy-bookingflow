import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Check, LayoutGrid, Loader2, Pencil, ChevronDown, Clock, CreditCard, AlertCircle, Image, Ruler, UserPen, MessageCircle, ExternalLink, X } from 'lucide-react';
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
  buyerName,
  orderNumber,
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
  const [editSlot, setEditSlot] = useState(null);
  const [editNameSlot, setEditNameSlot] = useState(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [incompleteWarning, setIncompleteWarning] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [editOnlyMode, setEditOnlyMode] = useState(null);

  const requireName = (totalRugCount || rugSlots.length) > 2;
  const isExpired = deadlineAt && new Date(deadlineAt) < new Date();

  const selectionsMap = useMemo(() => {
    const map = {};
    existingSelections.forEach((s) => { map[s.rugIndex] = s; });
    return map;
  }, [existingSelections]);

  // Seed participant names from saved selections so they persist across refreshes.
  useEffect(() => {
    const seeded = {};
    existingSelections.forEach((s) => {
      if (s.participantName) seeded[s.rugIndex] = s.participantName;
    });
    if (Object.keys(seeded).length) {
      setParticipantNames((prev) => ({ ...seeded, ...prev }));
    }
  }, [existingSelections]);

  const daysUntilWorkshop = useMemo(() => {
    if (!workshopStart) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ws = new Date(workshopStart);
    ws.setHours(0, 0, 0, 0);
    return Math.floor((ws - today) / (1000 * 60 * 60 * 24));
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
      // If reverting from 90x90 to 60x60, clear any pending upgrade for this slot
      if (pendingUpgrades[pendingProduct.rugIndex]) {
        setPendingUpgrades(prev => {
          const next = { ...prev };
          delete next[pendingProduct.rugIndex];
          return next;
        });
      }
      onSelectSketch(selection);
    }

    setShowModal(false);
    setPendingProduct(null);
    setEditOnlyMode(null);
  }, [pendingProduct, isExpired, onSelectSketch, pendingUpgrades]);

  const doPayAndSave = useCallback(() => {
    if (isExpired) { setDeadlineError(true); return; }
    const upgrades = Object.values(pendingUpgrades);
    onRequestUpgrade(upgrades);
    setPendingUpgrades({});
    setIncompleteWarning(null);
  }, [pendingUpgrades, isExpired, onRequestUpgrade]);

  const handlePayAndSave = useCallback(() => {
    if (isExpired) { setDeadlineError(true); return; }
    const totalSlots = rugSlots.length;
    const selectedCount = Object.keys(selectionsMap).length + Object.keys(pendingUpgrades).length;
    const unselected = totalSlots - selectedCount;
    if (unselected > 0) {
      setIncompleteWarning(unselected);
    } else {
      doPayAndSave();
    }
  }, [rugSlots, selectionsMap, pendingUpgrades, isExpired, doPayAndSave]);

  const getSketchStatusLabel = (sketchStatus) => {
    if (sketchStatus === 'Ready') return 'מוכנה';
    if (sketchStatus === 'In preparation') return 'בהכנה';
    return 'ניתן לשינוי';
  };

  const [sizePaymentAlert, setSizePaymentAlert] = useState(false);

  const handleEditAction = useCallback((action, slotIndex) => {
    const sel = selectionsMap[slotIndex];
    if (action === 'sketch' || action === 'size') {
      const status = sel?.sketchStatus || 'Changeable';
      if (status !== 'Changeable') {
        setEditSlot(null);
        setStatusError({ slot: slotIndex, status });
        return;
      }
    }
    if (action === 'size' && sel?.upgradePaymentStatus === 'paid') {
      setEditSlot(null);
      setSizePaymentAlert(true);
      return;
    }
    setEditSlot(null);
    if (action === 'sketch') {
      setEditOnlyMode('sketch');
      openCatalogForSlot(slotIndex);
    } else if (action === 'size') {
      const pending = pendingUpgrades[slotIndex];
      const current = sel || pending;
      if (!current) return;
      setEditOnlyMode('size');
      setPendingProduct({ ...current.productSnapshot, _id: current.productId, title: current.productSnapshot?.title, image: current.productSnapshot?.image, rugIndex: slotIndex });
      setShowModal(true);
    } else if (action === 'name') {
      setEditNameValue(participantNames[slotIndex] || '');
      setEditNameSlot(slotIndex);
    }
  }, [openCatalogForSlot, selectionsMap, pendingUpgrades, participantNames]);

  const handleSaveEditName = useCallback(() => {
    if (editNameSlot == null || editNameValue.trim().length < 2) return;
    setParticipantNames(prev => ({ ...prev, [editNameSlot]: editNameValue.trim() }));
    const sel = selectionsMap[editNameSlot];
    if (sel) {
      onSelectSketch({ ...sel, participantName: editNameValue.trim() });
    }
    const pending = pendingUpgrades[editNameSlot];
    if (pending) {
      setPendingUpgrades(prev => ({ ...prev, [editNameSlot]: { ...pending, participantName: editNameValue.trim() } }));
    }
    setEditNameSlot(null);
  }, [editNameSlot, editNameValue, selectionsMap, pendingUpgrades, onSelectSketch]);

  const sizeChangeWhatsAppUrl = useMemo(() => {
    const text = encodeURIComponent(`היי ביצעתי הזמנה על שם ${buyerName || ''}, מספר הזמנה ${orderNumber || ''} ואני מעוניין לעדכן את הסקיצה שלי`);
    return `https://api.whatsapp.com/send?phone=972522272270&text=${text}`;
  }, [buyerName, orderNumber]);

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
          const name = participantNames[slot.rugIndex] || sel?.participantName || slot.participantName;
          const sketchStatus = sel?.sketchStatus || 'Changeable';
          const sizePaidLock = sel?.upgradePaymentStatus === 'paid';
          const awaitingApproval = sel?.upgradePaymentStatus === 'pending-payment-approval';
          const isLocked = sel && (
            sketchStatus !== 'Changeable' ||
            (daysUntilWorkshop <= 6 && sel.confirmedAt)
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
                {sel && !isLocked && awaitingApproval && (
                  <span className="text-[11px] font-bold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />ממתין לאישור תשלום
                  </span>
                )}
                {sel && !isLocked && !awaitingApproval && (
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    sketchStatus === 'In preparation' ? 'bg-blue-100 text-blue-700' :
                    sketchStatus === 'Ready' ? 'bg-green-100 text-green-700' :
                    'bg-[#f5f0fa] text-[#5E2F88]'
                  }`}>
                    {getSketchStatusLabel(sketchStatus)}
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
                    <p className="text-xs text-[#464646]/60 mt-0.5" dir="rtl">
                      {display.canvasSize === '90x90'
                        ? <span>{'גודל: 90*90 ס"מ'}{(pending || awaitingApproval) && <span className="text-orange-600 font-medium">{' | תוספת: 299 ש"ח'}</span>}</span>
                        : <span>{'גודל: 60*60 ס"מ'}</span>}
                    </p>
                  </div>
                  {(!isLocked || sizePaidLock) && !isReadOnly && !isExpired && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditSlot(slot.rugIndex); }}
                      className="flex items-center gap-1 text-xs text-[#5E2F88] hover:text-[#7B3DB0] font-medium bg-white border border-[#5E2F88]/20 rounded-lg px-2.5 py-1.5 transition-colors shrink-0"
                    >
                      <Pencil className="w-3 h-3" />
                      עריכה
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
              {pendingUpgradeCount} {pendingUpgradeCount === 1 ? 'שטיח' : 'שטיחים'} בגודל 90*90 ס"מ ממתינים לתשלום
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
        onClose={() => { setShowModal(false); setPendingProduct(null); setEditOnlyMode(null); }}
        onConfirm={handleModalConfirm}
        sketchTitle={pendingProduct?.title || ''}
        deadlineAt={deadlineAt}
        requireName={requireName}
        existingName={participantNames[pendingProduct?.rugIndex] || ''}
        daysUntilWorkshop={daysUntilWorkshop}
        skipNameStep={!!editOnlyMode}
      />

      {/* Edit action modal */}
      <AnimatePresence>
        {editSlot != null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setEditSlot(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-5 space-y-3 relative"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              <button type="button" onClick={() => setEditSlot(null)} className="absolute top-3 left-3 text-[#464646]/50 hover:text-[#464646]">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-[17px] font-bold text-[#581E83] text-center">עריכת שטיח {editSlot + 1}</h3>

              <button
                type="button"
                onClick={() => handleEditAction('sketch', editSlot)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-[#e8e8e8] hover:border-[#5E2F88] hover:bg-[#f5f0fa] transition-all text-right"
              >
                <div className="w-9 h-9 rounded-lg bg-[#f5f0fa] flex items-center justify-center shrink-0">
                  <Image className="w-4 h-4 text-[#5E2F88]" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#581E83]">החלפת סקיצה</p>
                  <p className="text-[12px] text-[#464646]/60">בחירת עיצוב אחר מהקטלוג</p>
                </div>
              </button>

              {(() => {
                const sel = selectionsMap[editSlot];
                const sizePaid = sel?.upgradePaymentStatus === 'paid';
                return (
                  <div>
                    <button
                      type="button"
                      disabled={sizePaid}
                      onClick={() => !sizePaid && handleEditAction('size', editSlot)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-right ${
                        sizePaid ? 'border-[#e8e8e8] bg-gray-50 opacity-60 cursor-not-allowed' : 'border-[#e8e8e8] hover:border-[#5E2F88] hover:bg-[#f5f0fa]'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#f5f0fa] flex items-center justify-center shrink-0">
                        <Ruler className="w-4 h-4 text-[#5E2F88]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[14px] font-semibold text-[#581E83]">שינוי גודל</p>
                        <p className="text-[12px] text-[#464646]/60">60*60 או 90*90 ס"מ</p>
                      </div>
                    </button>
                    {sizePaid && (
                      <div className="mt-2 bg-orange-50 border border-orange-200 rounded-xl p-2.5 space-y-2">
                        <p className="text-[12px] text-orange-800">לשינוי גודל סקיצה יש לפנות לשירות הלקוחות שלנו</p>
                        <a
                          href={sizeChangeWhatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-[13px] font-medium py-2 rounded-lg transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          פנייה בוואטסאפ
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}

              {requireName && (
                <button
                  type="button"
                  onClick={() => handleEditAction('name', editSlot)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-[#e8e8e8] hover:border-[#5E2F88] hover:bg-[#f5f0fa] transition-all text-right"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#f5f0fa] flex items-center justify-center shrink-0">
                    <UserPen className="w-4 h-4 text-[#5E2F88]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-[#581E83]">שינוי שם משתתף</p>
                    <p className="text-[12px] text-[#464646]/60">{participantNames[editSlot] || 'לא הוגדר'}</p>
                  </div>
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit name modal */}
      <AnimatePresence>
        {editNameSlot != null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setEditNameSlot(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-5 space-y-4 relative"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[17px] font-bold text-[#581E83] text-center">שינוי שם משתתף</h3>
              <input
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                placeholder="שם (לפחות 2 תווים)"
                className="w-full border-2 border-[#e8e8e8] focus:border-[#5E2F88] rounded-xl px-4 py-3 text-sm text-[#464646] outline-none transition-colors"
                autoFocus
              />
              <div className="flex gap-3 w-full">
                <Button variant="outline" onClick={() => setEditNameSlot(null)} className="flex-1 border-[#e8e8e8]">ביטול</Button>
                <Button onClick={handleSaveEditName} disabled={editNameValue.trim().length < 2} className="flex-1 bg-[#5E2F88] hover:bg-[#7B3DB0] text-white">שמירה</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incomplete selection warning */}
      <AnimatePresence>
        {incompleteWarning != null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setIncompleteWarning(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4 relative"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <AlertCircle className="w-10 h-10 text-orange-500 mx-auto mb-2" />
                <h3 className="text-[17px] font-bold text-[#581E83]">שימו לב</h3>
                <p className="text-sm text-[#464646]/70 mt-2">
                  {incompleteWarning} {incompleteWarning === 1 ? 'סקיצה עדיין לא נבחרה' : 'סקיצות עדיין לא נבחרו'}
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <Button variant="outline" onClick={() => setIncompleteWarning(null)} className="flex-1 border-[#e8e8e8]">ביטול</Button>
                <Button onClick={doPayAndSave} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">אישור ומעבר לתשלום</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status error popup — sketch not changeable */}
      <AnimatePresence>
        {statusError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setStatusError(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4 relative"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              <button type="button" onClick={() => setStatusError(null)} className="absolute top-3 left-3 text-[#464646]/50 hover:text-[#464646]">
                <X className="w-5 h-5" />
              </button>
              <div className="text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                <h3 className="text-[17px] font-bold text-[#581E83]">לא ניתן לערוך</h3>
                <p className="text-sm text-[#464646]/70 mt-2">
                  הסקיצה בסטטוס "{getSketchStatusLabel(statusError.status)}" ולא ניתנת לשינוי.
                </p>
                <p className="text-xs text-[#464646]/50 mt-1">לעזרה נוספת ניתן לפנות לשירות הלקוחות שלנו</p>
              </div>
              <a
                href={sizeChangeWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2.5 rounded-xl text-[14px] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                פנייה בוואטסאפ
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Button variant="outline" onClick={() => setStatusError(null)} className="w-full border-[#e8e8e8]">סגירה</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Size locked after payment alert */}
      <AnimatePresence>
        {sizePaymentAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setSizePaymentAlert(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4 relative"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              <button type="button" onClick={() => setSizePaymentAlert(false)} className="absolute top-3 left-3 text-[#464646]/50 hover:text-[#464646]">
                <X className="w-5 h-5" />
              </button>
              <div className="text-center">
                <AlertCircle className="w-10 h-10 text-orange-500 mx-auto mb-2" />
                <h3 className="text-[17px] font-bold text-[#581E83]">לא ניתן לשנות גודל</h3>
                <p className="text-sm text-[#464646]/70 mt-2">
                  לא ניתן לשנות את הגודל לאחר השלמת התשלום.
                </p>
                <p className="text-xs text-[#464646]/50 mt-1">לעזרה נוספת ניתן לפנות לשירות הלקוחות שלנו</p>
              </div>
              <a
                href={sizeChangeWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2.5 rounded-xl text-[14px] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                פנייה בוואטסאפ
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Button variant="outline" onClick={() => setSizePaymentAlert(false)} className="w-full border-[#e8e8e8]">סגירה</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
