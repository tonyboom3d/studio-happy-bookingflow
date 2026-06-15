import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Check, Plus, Minus, Baby, Users, LayoutGrid, ChevronDown, ChevronUp,
  Sparkles, Image as ImageIcon, X, AlertCircle, CreditCard, Trash2, Pencil, Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SketchCatalogSheet from './SketchCatalogSheet';

function getSketchStatusBadge(sketch, editingWindowClosed) {
  const status = sketch.sketchStatus || '';
  const upgrade = sketch.upgradePaymentStatus || null;
  const is90 = sketch.size === '90x90';

  if (status === 'סקיצה מוכנה' || status === 'Ready')
    return { label: 'סקיצה מוכנה', bg: 'bg-green-100', text: 'text-green-700' };
  if (status === 'In preparation' || status === 'סקיצה בהכנה')
    return { label: 'סקיצה בהכנה', bg: 'bg-blue-100', text: 'text-blue-700' };
  if (editingWindowClosed)
    return { label: 'לא ניתן לשינוי', bg: 'bg-gray-100', text: 'text-gray-600' };
  if (is90 && upgrade === 'pending-payment-approval')
    return { label: 'ממתין לאישור תשלום', bg: 'bg-orange-100', text: 'text-orange-700' };
  if (is90 && upgrade !== 'paid')
    return { label: 'לא שולמה', bg: 'bg-red-100', text: 'text-red-700' };
  return { label: 'הושלמה', bg: 'bg-green-100', text: 'text-green-700' };
}

export default function OrganizerSelfSelectionView({
  order,
  catalog,
  selections,
  onSelectSketch,
  onRequestUpgrade,
  onFetchCatalog,
  editingWindowClosed = false,
}) {
  const [cards, setCards] = useState(() => buildInitialCards(order, selections));
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupAdults, setSetupAdults] = useState(1);
  const [setupChildren, setSetupChildren] = useState(0);

  // Source selection state
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceCardIdx, setSourceCardIdx] = useState(null);

  // Catalog multi-select
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogCardIdx, setCatalogCardIdx] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Review modal
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewCardIdx, setReviewCardIdx] = useState(null);
  const [reviewError, setReviewError] = useState('');

  // Expanded cards
  const [expandedCards, setExpandedCards] = useState({});

  // Setup error
  const [setupError, setSetupError] = useState('');

  // Group deletion confirmation
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState(null);

  // Group name editing
  const [editingNameIdx, setEditingNameIdx] = useState(null);
  const [editNameValue, setEditNameValue] = useState('');

  const totalRugs = order.rugCount || 0;
  const maxChildren = order.children || 0;
  const usedRugs = cards.reduce((s, c) => s + c.adults, 0);
  const usedChildren = cards.reduce((s, c) => s + c.children, 0);
  const remainingRugs = Math.max(0, totalRugs - usedRugs);
  const remainingChildren = Math.max(0, maxChildren - usedChildren);

  const totalSelectedSketches = cards.reduce((s, c) => s + c.sketches.length, 0);

  // Bulk 90cm upgrade tracking
  const allPendingUpgrades = useMemo(() => {
    const upgrades = [];
    cards.forEach(card => {
      card.sketches.forEach(sketch => {
        if (sketch.size === '90x90' && sketch.upgradePaymentStatus !== 'paid') {
          upgrades.push({
            rugIndex: sketch.rugIndex,
            productId: sketch.productId,
            productSnapshot: { title: sketch.title, image: sketch.image },
            canvasSize: '90x90',
            participantName: card.name,
          });
        }
      });
    });
    return upgrades;
  }, [cards]);

  // Child allocation: minimum children to keep remaining pool valid
  const minChildrenForSetup = useMemo(() => {
    if (maxChildren <= 0 || remainingChildren <= 0) return 0;
    return Math.max(0, remainingChildren - (remainingRugs - setupAdults));
  }, [maxChildren, remainingChildren, remainingRugs, setupAdults]);

  useEffect(() => {
    if (setupOpen && setupChildren < minChildrenForSetup) {
      setSetupChildren(minChildrenForSetup);
    }
  }, [minChildrenForSetup, setupOpen]);

  function buildInitialCards(ord, sels) {
    if (!sels?.length) return [];
    const grouped = {};
    sels.forEach(s => {
      const key = s.participantName || '__default__';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    return Object.entries(grouped).map(([name, items], idx) => ({
      id: `card_${idx}`,
      name: name === '__default__' ? `קבוצה ${idx + 1}` : name,
      adults: items.length,
      children: 0,
      sketches: items.map(s => ({
        productId: s.productId,
        title: s.productSnapshot?.title || s.title || 'סקיצה',
        image: s.productSnapshot?.image || null,
        size: s.canvasSize || '60x60',
        source: 'catalog',
        rugIndex: s.rugIndex,
        upgradePaymentStatus: s.upgradePaymentStatus || null,
      })),
    }));
  }

  const openSetup = () => {
    if (remainingRugs <= 0) return;
    setSetupAdults(1);
    setSetupChildren(0);
    setSetupOpen(true);
  };

  const confirmSetup = () => {
    if (setupChildren > setupAdults) {
      setSetupError('מספר הילדים לא יכול לעלות על מספר המבוגרים בקבוצה');
      return;
    }
    const effectiveChildren = Math.max(setupChildren, minChildrenForSetup);
    if (effectiveChildren > setupAdults) {
      setSetupError('מספר הילדים לא יכול לעלות על מספר המבוגרים בקבוצה');
      return;
    }
    setSetupError('');
    const newCard = {
      id: `card_${Date.now()}`,
      name: `קבוצה ${cards.length + 1}`,
      adults: setupAdults,
      children: effectiveChildren,
      sketches: [],
    };
    setCards(prev => [...prev, newCard]);
    setSetupOpen(false);
    setSourceCardIdx(cards.length);
    setSourceOpen(true);
  };

  const openSourceFor = (cardIdx) => {
    setSourceCardIdx(cardIdx);
    setSourceOpen(true);
  };

  const chooseSource = async (source) => {
    setSourceOpen(false);
    if (source === 'catalog') {
      setCatalogCardIdx(sourceCardIdx);
      if (!catalog?.length && onFetchCatalog) {
        setCatalogLoading(true);
        try { await onFetchCatalog(); } finally { setCatalogLoading(false); }
      }
      setCatalogOpen(true);
    } else {
      setCards(prev => {
        const rugIndex = getNextRugIndex(prev);
        return prev.map((c, i) => {
          if (i !== sourceCardIdx) return c;
          return {
            ...c,
            sketches: [...c.sketches, {
              productId: null,
              title: 'עיצוב מותאם אישית (AI)',
              image: null,
              size: '60x60',
              source: 'ai',
              rugIndex,
            }],
          };
        });
      });
    }
  };

  const getNextRugIndex = useCallback((currentCards) => {
    const src = currentCards || cards;
    const used = new Set();
    src.forEach(c => c.sketches.forEach(s => used.add(s.rugIndex)));
    (selections || []).forEach(s => used.add(s.rugIndex));
    let idx = 0;
    while (used.has(idx)) idx++;
    return idx;
  }, [cards, selections]);

  const handleCatalogPick = (product) => {
    if (catalogCardIdx == null) return;
    setCards(prev => {
      const rugIndex = getNextRugIndex(prev);
      return prev.map((c, i) => {
        if (i !== catalogCardIdx) return c;
        return {
          ...c,
          sketches: [...c.sketches, {
            productId: product._id,
            title: product.title,
            image: product.image,
            size: '60x60',
            source: 'catalog',
            rugIndex,
          }],
        };
      });
    });
  };

  const catalogCard = catalogCardIdx != null ? cards[catalogCardIdx] : null;
  const catalogQuota = catalogCard ? catalogCard.adults : 0;
  const catalogPicked = catalogCard ? catalogCard.sketches.length : 0;
  const catalogRemaining = Math.max(0, catalogQuota - catalogPicked);

  const catalogSelectedCounts = useMemo(() => {
    if (catalogCardIdx == null) return {};
    const card = cards[catalogCardIdx];
    if (!card) return {};
    const counts = {};
    card.sketches.forEach(s => {
      if (s.productId) counts[s.productId] = (counts[s.productId] || 0) + 1;
    });
    return counts;
  }, [catalogCardIdx, cards]);

  const handleCatalogRemovePick = useCallback((product) => {
    if (catalogCardIdx == null) return;
    setCards(prev => prev.map((c, i) => {
      if (i !== catalogCardIdx) return c;
      const lastIdx = [...c.sketches].reverse().findIndex(s => s.productId === (product._id || product.id));
      if (lastIdx < 0) return c;
      const realIdx = c.sketches.length - 1 - lastIdx;
      return { ...c, sketches: c.sketches.filter((_, si) => si !== realIdx) };
    }));
  }, [catalogCardIdx]);

  const handleCatalogDone = () => {
    setCatalogOpen(false);
    setReviewCardIdx(catalogCardIdx);
    setReviewError('');
    setReviewOpen(true);
  };

  const openReview = (cardIdx) => {
    setReviewCardIdx(cardIdx);
    setReviewError('');
    setReviewOpen(true);
  };

  const updateSketchSize = (cardIdx, sketchIdx, newSize) => {
    setCards(prev => prev.map((c, i) => {
      if (i !== cardIdx) return c;
      const updated = [...c.sketches];
      updated[sketchIdx] = { ...updated[sketchIdx], size: newSize };
      return { ...c, sketches: updated };
    }));
  };

  const removeSketch = (cardIdx, sketchIdx) => {
    setCards(prev => prev.map((c, i) => {
      if (i !== cardIdx) return c;
      const updated = c.sketches.filter((_, si) => si !== sketchIdx);
      return { ...c, sketches: updated };
    }));
  };

  const confirmReview = async () => {
    if (reviewCardIdx == null) return;
    const card = cards[reviewCardIdx];
    if (card.sketches.length < card.adults) {
      setReviewError(`יש לבחור לפחות ${card.adults} סקיצות (נבחרו ${card.sketches.length})`);
      return;
    }
    setReviewError('');

    for (const sketch of card.sketches) {
      if (sketch.source === 'ai') continue;
      const selData = {
        rugIndex: sketch.rugIndex,
        productId: sketch.productId,
        productSnapshot: { title: sketch.title, image: sketch.image },
        canvasSize: '60x60',
        participantName: card.name,
      };
      await onSelectSketch(selData);
    }

    setReviewOpen(false);
    setExpandedCards(prev => ({ ...prev, [reviewCardIdx]: true }));
  };

  const toggleExpand = (idx) => {
    setExpandedCards(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const deleteCard = (idx) => {
    setCards(prev => prev.filter((_, i) => i !== idx));
    setDeleteConfirmIdx(null);
  };

  const startEditName = (idx) => {
    setEditNameValue(cards[idx]?.name || '');
    setEditingNameIdx(idx);
  };

  const saveEditName = () => {
    if (editingNameIdx == null || editNameValue.trim().length < 1) return;
    setCards(prev => prev.map((c, i) =>
      i === editingNameIdx ? { ...c, name: editNameValue.trim() } : c
    ));
    setEditingNameIdx(null);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-bold text-[#581E83]">בחירת סקיצות</h3>

      <div className="bg-[#f5f0fa] border border-[#5E2F88]/15 rounded-xl p-3 text-[14px] text-[#464646] leading-relaxed">
        צרו קבוצה לכל משתתף/ים ובחרו סקיצות מהקטלוג או עיצוב מותאם אישית.
        כל קבוצה מקבלת מספר שטיחים בהתאם למספר המבוגרים שהוגדר.
      </div>

      {/* Allocation summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#f5f0fa] rounded-xl p-2.5 text-center">
          <LayoutGrid className="w-4 h-4 text-[#5E2F88] mx-auto mb-1" />
          <p className="text-lg font-bold text-[#581E83] tabular-nums leading-none">{usedRugs}/{totalRugs}</p>
          <p className="text-[14px] text-[#464646]/60 mt-0.5">שטיחים</p>
          {remainingRugs > 0 && <p className="text-[13px] text-orange-600 font-semibold mt-0.5">נותרו {remainingRugs}</p>}
          {remainingRugs === 0 && usedRugs > 0 && <p className="text-[13px] text-green-600 font-semibold mt-0.5">הכל מוקצה</p>}
        </div>
        <div className="bg-[#f5f0fa] rounded-xl p-2.5 text-center">
          <Users className="w-4 h-4 text-[#5E2F88] mx-auto mb-1" />
          <p className="text-lg font-bold text-[#581E83] tabular-nums leading-none">{order.adults || 0}</p>
          <p className="text-[14px] text-[#464646]/60 mt-0.5">משתתפים</p>
        </div>
        {maxChildren > 0 && (
          <div className="bg-[#f5f0fa] rounded-xl p-2.5 text-center">
            <Baby className="w-4 h-4 text-[#5E2F88] mx-auto mb-1" />
            <p className="text-lg font-bold text-[#581E83] tabular-nums leading-none">{usedChildren}/{maxChildren}</p>
            <p className="text-[14px] text-[#464646]/60 mt-0.5">ילדים</p>
          </div>
        )}
      </div>

      {/* Bulk 90cm upgrade payment */}
      {allPendingUpgrades.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[14px] font-semibold text-orange-800 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" />
              {allPendingUpgrades.length} {allPendingUpgrades.length === 1 ? 'שטיח' : 'שטיחים'} בגודל 90×90 ממתינים לתשלום
            </span>
            <span className="text-[15px] font-bold text-orange-800">₪{allPendingUpgrades.length * 299}</span>
          </div>
          <p className="text-[12px] text-orange-700/70 mb-2.5">
            שטיחים אלו נשמרו בגודל 60×60 ויעודכנו ל-90×90 רק לאחר השלמת התשלום
          </p>
          <button
            type="button"
            onClick={() => onRequestUpgrade(allPendingUpgrades)}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-[15px] transition-colors shadow-sm"
          >
            <CreditCard className="w-4 h-4" />
            תשלום שדרוג 90×90 · ₪{allPendingUpgrades.length * 299}
          </button>
        </div>
      )}

      {/* Create button */}
      <button
        type="button"
        onClick={openSetup}
        disabled={remainingRugs <= 0}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[15px] font-semibold transition-colors ${
          remainingRugs > 0
            ? 'bg-[#5E2F88] hover:bg-[#7B3DB0] text-white'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <Plus className="w-4 h-4" />
        {remainingRugs > 0 ? `בחירת סקיצה · נותרו ${remainingRugs} שטיחים` : 'כל השטיחים הוקצו'}
      </button>

      {/* Cards */}
      {cards.map((card, idx) => {
        const isExpanded = expandedCards[idx];
        const quota = card.adults;
        const picked = card.sketches.length;
        const complete = picked >= quota;

        return (
          <div
            key={card.id}
            className={`bg-white rounded-xl border-2 p-3.5 transition-all ${
              complete ? 'border-green-200' : 'border-[#e8e8e8]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  complete ? 'bg-green-100 text-green-700' : 'bg-[#f5f0fa] text-[#5E2F88]'
                }`}>
                  {complete ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span className="text-[15px] font-semibold text-[#581E83] truncate">{card.name}</span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  complete ? 'bg-green-100 text-green-700' : picked > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${complete ? 'bg-green-500' : picked > 0 ? 'bg-orange-500' : 'bg-red-500'}`} />
                  {complete ? 'הושלם' : picked > 0 ? 'חלקי' : 'ממתין'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEditName(idx)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[#5E2F88]/60 hover:text-[#5E2F88] hover:bg-[#f5f0fa] transition-colors"
                  title="עריכת שם"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {complete && (
                  <button
                    type="button"
                    onClick={() => openReview(idx)}
                    className="text-[11px] font-medium text-[#5E2F88] bg-[#f5f0fa] hover:bg-[#ebe0f5] px-2 py-1 rounded-lg transition-colors"
                  >
                    עריכה
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDeleteConfirmIdx(idx)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="מחיקת קבוצה"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleExpand(idx)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5E2F88] hover:bg-[#f5f0fa] transition-colors"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Summary line */}
            <div className="flex items-center gap-4 mt-2 mb-0.5">
              <span className="flex items-center gap-1.5 text-[14px] text-[#464646]/50">
                <Users className="w-3.5 h-3.5 text-[#5E2F88]" />
                {card.adults} {card.adults === 1 ? 'מבוגר' : 'מבוגרים'}
              </span>
              {card.children > 0 && (
                <span className="flex items-center gap-1.5 text-[14px] text-[#464646]/50">
                  <Baby className="w-3.5 h-3.5 text-[#5E2F88]" />
                  {card.children} {card.children === 1 ? 'ילד' : 'ילדים'}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-[14px] text-[#464646]/50">
                <LayoutGrid className="w-3.5 h-3.5 text-[#5E2F88]" />
                {card.adults} {card.adults === 1 ? 'שטיח' : 'שטיחים'}
              </span>
            </div>

            {/* Action buttons */}
            {!complete && (
              <button
                type="button"
                onClick={() => openSourceFor(idx)}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-medium bg-[#f5f0fa] text-[#5E2F88] hover:bg-[#ebe0f5] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                בחירת סקיצה ({picked}/{quota})
              </button>
            )}

            {/* Expandable sketches */}
            <AnimatePresence initial={false}>
              {isExpanded && card.sketches.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 mt-2.5 pt-2.5 border-t border-[#e8e8e8]">
                    {card.sketches.map((sketch, si) => {
                      const badge = getSketchStatusBadge(sketch, editingWindowClosed);
                      return (
                        <div key={si} className="flex items-center gap-2.5 bg-[#fafafa] rounded-lg p-2">
                          {sketch.image ? (
                            <img src={sketch.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#f5f0fa] flex items-center justify-center shrink-0">
                              {sketch.source === 'ai' ? <Sparkles className="w-4 h-4 text-[#5E2F88]" /> : <ImageIcon className="w-4 h-4 text-[#5E2F88]" />}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#581E83] truncate">{sketch.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                sketch.source === 'ai' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {sketch.source === 'ai' ? 'AI' : 'קטלוג'}
                              </span>
                              <span className="text-[11px] text-[#464646]/50">
                                {sketch.size === '90x90' ? '90×90 ס"מ' : '60×60 ס"מ'}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${badge.bg} ${badge.text}`}>
                                {(badge.label === 'לא ניתן לשינוי' || badge.label === 'סקיצה מוכנה') && <Lock className="w-2.5 h-2.5" />}
                                {badge.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Setup Modal */}
      <AnimatePresence>
        {setupOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setSetupOpen(false)}
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
              <button type="button" onClick={() => setSetupOpen(false)} className="absolute top-3 left-3 text-[#464646]/50 hover:text-[#464646]">
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                <div className="w-11 h-11 rounded-full bg-[#f5f0fa] flex items-center justify-center mx-auto mb-2">
                  <Users className="w-6 h-6 text-[#5E2F88]" />
                </div>
                <h3 className="text-[19px] font-bold text-[#581E83]">הגדרת קבוצה</h3>
                <p className="text-[14px] text-[#464646]/70 mt-1">
                  כמה משתתפים בקבוצה? (כל מבוגר = שטיח אחד)
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[15px] text-[#464646]">
                    <Users className="w-4 h-4 text-[#5E2F88]" />
                    מבוגרים
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSetupAdults(v => Math.max(1, v - 1))}
                      disabled={setupAdults <= 1}
                      className="w-7 h-7 rounded-full border border-[#e8e8e8] flex items-center justify-center text-[#5E2F88] hover:bg-[#f5f0fa] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[15px] font-bold text-[#581E83] tabular-nums w-6 text-center">{setupAdults}</span>
                    <button
                      type="button"
                      onClick={() => setSetupAdults(v => Math.min(remainingRugs, v + 1))}
                      disabled={setupAdults >= remainingRugs}
                      className="w-7 h-7 rounded-full border border-[#e8e8e8] flex items-center justify-center text-[#5E2F88] hover:bg-[#f5f0fa] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {maxChildren > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[15px] text-[#464646]">
                      <Baby className="w-4 h-4 text-[#5E2F88]" />
                      ילדים
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSetupChildren(v => Math.max(minChildrenForSetup, v - 1))}
                        disabled={setupChildren <= minChildrenForSetup}
                        className="w-7 h-7 rounded-full border border-[#e8e8e8] flex items-center justify-center text-[#5E2F88] hover:bg-[#f5f0fa] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[15px] font-bold text-[#581E83] tabular-nums w-6 text-center">{setupChildren}</span>
                      <button
                        type="button"
                        onClick={() => setSetupChildren(v => Math.min(remainingChildren, v + 1))}
                        disabled={setupChildren >= remainingChildren}
                        className="w-7 h-7 rounded-full border border-[#e8e8e8] flex items-center justify-center text-[#5E2F88] hover:bg-[#f5f0fa] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-[13px] text-[#464646]/50 flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-[#5E2F88]" />
                  יש לבחור {setupAdults} {setupAdults === 1 ? 'סקיצה' : 'סקיצות'} לקבוצה זו
                </p>

                {minChildrenForSetup > 0 && setupChildren < minChildrenForSetup && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-[13px] text-orange-700 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      יש לשייך לפחות {minChildrenForSetup} {minChildrenForSetup === 1 ? 'ילד' : 'ילדים'} לקבוצה זו.
                      {' '}אחרת ייוותרו {remainingRugs - setupAdults} {(remainingRugs - setupAdults) === 1 ? 'מבוגר' : 'מבוגרים'} ו-{remainingChildren - setupChildren} ילדים — מספר הילדים יעלה על המבוגרים.
                    </span>
                  </div>
                )}

                {setupError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[13px] text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {setupError}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={confirmSetup}
                className="w-full flex items-center justify-center gap-2 bg-[#5E2F88] hover:bg-[#7B3DB0] text-white font-semibold py-3 rounded-xl text-[15px] transition-colors"
              >
                המשך לבחירת סקיצה
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Source Selection Modal */}
      <AnimatePresence>
        {sourceOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setSourceOpen(false)}
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
              <button type="button" onClick={() => setSourceOpen(false)} className="absolute top-3 left-3 text-[#464646]/50 hover:text-[#464646]">
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                <h3 className="text-[19px] font-bold text-[#581E83]">מאיפה תרצו לבחור?</h3>
                <p className="text-[14px] text-[#464646]/70 mt-1">בחרו את מקור הסקיצה</p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => chooseSource('catalog')}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-[#5E2F88] bg-[#f5f0fa] hover:bg-[#ebe0f5] transition-all text-right relative"
                >
                  <div className="w-10 h-10 rounded-full bg-[#5E2F88] flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] font-semibold text-[#581E83]">בחירת סקיצה מקטלוג</span>
                      <span className="text-[10px] font-bold bg-[#5E2F88] text-white px-2 py-0.5 rounded-full">מומלץ</span>
                    </div>
                    <p className="text-[13px] text-[#464646]/60 mt-0.5">בחרו מתוך מגוון עיצובים מוכנים</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => chooseSource('ai')}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-[#e8e8e8] bg-white hover:border-purple-300 hover:bg-purple-50 transition-all text-right"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[16px] font-semibold text-[#464646]">רוצה לתפור משהו משלי</span>
                    <p className="text-[13px] text-[#464646]/60 mt-0.5">עיצוב מותאם אישית בעזרת AI</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Catalog Sheet — stays open until "done" */}
      <SketchCatalogSheet
        isOpen={catalogOpen}
        onClose={handleCatalogDone}
        catalog={catalog}
        selectedProductId={null}
        onPick={handleCatalogPick}
        onRemovePick={handleCatalogRemovePick}
        slotLabel={catalogRemaining > 0 ? `נותרו ${catalogRemaining} סקיצות לבחירה` : 'כל הסקיצות נבחרו'}
        readOnly={false}
        keepOpenOnPick={catalogQuota > 1}
        selectedCounts={catalogSelectedCounts}
        maxSelections={catalogQuota}
        totalSelected={catalogPicked}
      />

      {/* Review Modal */}
      <AnimatePresence>
        {reviewOpen && reviewCardIdx != null && (() => {
          const card = cards[reviewCardIdx];
          if (!card) return null;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={() => setReviewOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4 relative max-h-[90vh] overflow-y-auto"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
              >
                <button type="button" onClick={() => setReviewOpen(false)} className="absolute top-3 left-3 text-[#464646]/50 hover:text-[#464646]">
                  <X className="w-5 h-5" />
                </button>

                <div className="text-center">
                  <h3 className="text-[19px] font-bold text-[#581E83]">סיכום בחירות — {card.name}</h3>
                  <p className="text-[14px] text-[#464646]/70 mt-1">
                    {card.sketches.length}/{card.adults} סקיצות נבחרו
                    {card.sketches.length < card.adults && (
                      <span className="text-orange-600 font-medium"> · חסרות {card.adults - card.sketches.length}</span>
                    )}
                  </p>
                </div>

                {card.sketches.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-[14px] text-[#464646]/60">לא נבחרו סקיצות עדיין</p>
                    <button
                      type="button"
                      onClick={() => { setReviewOpen(false); openSourceFor(reviewCardIdx); }}
                      className="mt-3 text-[#5E2F88] font-semibold text-[14px] hover:underline"
                    >
                      בחירת סקיצות
                    </button>
                  </div>
                )}

                {card.sketches.length > 0 && (
                  <div className="space-y-2.5">
                    {card.sketches.map((sketch, si) => (
                      <div key={si} className="flex items-center gap-2.5 bg-[#fafafa] rounded-xl p-3">
                        {sketch.image ? (
                          <img src={sketch.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#f5f0fa] flex items-center justify-center shrink-0">
                            {sketch.source === 'ai' ? <Sparkles className="w-5 h-5 text-purple-600" /> : <ImageIcon className="w-5 h-5 text-[#5E2F88]" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#581E83] truncate">{sketch.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              sketch.source === 'ai' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {sketch.source === 'ai' ? 'AI' : 'קטלוג'}
                            </span>
                            <select
                              value={sketch.size}
                              onChange={(e) => updateSketchSize(reviewCardIdx, si, e.target.value)}
                              className="text-[12px] border border-[#e8e8e8] rounded-lg px-2 py-1 bg-white text-[#464646] focus:outline-none focus:border-[#5E2F88]"
                            >
                              <option value="60x60">60×60 ס"מ</option>
                              <option value="90x90">90×90 ס"מ (+₪299)</option>
                            </select>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSketch(reviewCardIdx, si)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {card.sketches.length < card.adults && (
                  <button
                    type="button"
                    onClick={() => { setReviewOpen(false); openSourceFor(reviewCardIdx); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-medium border-2 border-dashed border-[#5E2F88]/30 text-[#5E2F88] hover:bg-[#f5f0fa] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    הוספת סקיצה נוספת
                  </button>
                )}

                {reviewError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[13px] text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {reviewError}
                  </div>
                )}

                {card.sketches.some(s => s.size === '90x90') && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-[13px] text-orange-700 flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 shrink-0" />
                    סקיצות בגודל 90×90 דורשות תשלום נוסף של ₪299 לכל שטיח
                  </div>
                )}

                <button
                  type="button"
                  onClick={confirmReview}
                  disabled={card.sketches.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-[#5E2F88] hover:bg-[#7B3DB0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-[15px] transition-colors"
                >
                  <Check className="w-4 h-4" />
                  אישור ושמירה
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmIdx != null && (() => {
          const card = cards[deleteConfirmIdx];
          if (!card) return null;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={() => setDeleteConfirmIdx(null)}
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
                <button type="button" onClick={() => setDeleteConfirmIdx(null)} className="absolute top-3 left-3 text-[#464646]/50 hover:text-[#464646]">
                  <X className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-[19px] font-bold text-[#581E83]">מחיקת קבוצה</h3>
                  <p className="text-[14px] text-[#464646]/70 mt-2">
                    האם למחוק את הקבוצה <strong>"{card.name}"</strong>?
                  </p>
                  {card.sketches.length > 0 && (
                    <p className="text-[13px] text-red-600 mt-1 font-medium">
                      {card.sketches.length} סקיצות שנבחרו יימחקו לצמיתות
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmIdx(null)}
                    className="flex-1 py-2.5 rounded-xl border-2 border-[#e8e8e8] text-[14px] font-medium text-[#464646] hover:bg-[#fafafa] transition-colors"
                  >
                    ביטול
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCard(deleteConfirmIdx)}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[14px] font-medium transition-colors"
                  >
                    מחיקה
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Edit Name Modal */}
      <AnimatePresence>
        {editingNameIdx != null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setEditingNameIdx(null)}
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
              <h3 className="text-[17px] font-bold text-[#581E83] text-center">שינוי שם קבוצה</h3>
              <input
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                placeholder="שם הקבוצה"
                className="w-full border-2 border-[#e8e8e8] focus:border-[#5E2F88] rounded-xl px-4 py-3 text-sm text-[#464646] outline-none transition-colors"
                autoFocus
              />
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setEditingNameIdx(null)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-[#e8e8e8] text-[14px] font-medium text-[#464646] hover:bg-[#fafafa] transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={saveEditName}
                  disabled={editNameValue.trim().length < 1}
                  className="flex-1 py-2.5 rounded-xl bg-[#5E2F88] hover:bg-[#7B3DB0] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-medium transition-colors"
                >
                  שמירה
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {catalogLoading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-[#5E2F88]">
          <div className="w-4 h-4 border-2 border-[#5E2F88] border-t-transparent rounded-full animate-spin" />
          טוען קטלוג...
        </div>
      )}
    </div>
  );
}
