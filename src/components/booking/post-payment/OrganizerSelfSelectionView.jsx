import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Check, Plus, Minus, Baby, Users, LayoutGrid, ChevronDown, ChevronUp,
  Sparkles, Image as ImageIcon, X, AlertCircle, CreditCard, Trash2, Pencil, Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SketchCatalogSheet from './SketchCatalogSheet';
import AISketchModal from './AISketchModal';
import EnlargeableSketchImage from './EnlargeableSketchImage';
import { isAiTestModeEnabled, getSelectionDisplaySize, selectionWants90Upgrade } from '@/lib/utils';

function getSketchStatusBadge(sketch, editingWindowClosed) {
  const status = sketch.sketchStatus || '';
  const upgrade = sketch.upgradePaymentStatus || null;
  const is90 = getSelectionDisplaySize(sketch) === '90x90';

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
  participants,
  selections,
  onSelectSketch,
  onRequestUpgrade,
  onFetchCatalog,
  editingWindowClosed = false,
  onValidateImage,
  onGenerateSketch,
  onSaveApprovedSketch,
  onSubmitFeedback,
  onCheckRateLimit,
  onCreateGroup,
  onUpdateParticipant,
  onDeleteOrganizerGroup,
}) {
  const [cards, setCards] = useState(() => buildInitialCards(participants, selections));
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupAdults, setSetupAdults] = useState(1);
  const [setupChildren, setSetupChildren] = useState(0);
  const [setupCreating, setSetupCreating] = useState(false);
  const seededParticipantIdsRef = React.useRef(new Set((participants || []).map(p => p._id)));

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
  const [deletingCard, setDeletingCard] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Group name editing
  const [editingNameIdx, setEditingNameIdx] = useState(null);
  const [editNameValue, setEditNameValue] = useState('');

  // AI sketch modal
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalCardIdx, setAiModalCardIdx] = useState(null);

  const totalRugs = order.rugCount || 0;
  const maxChildren = order.children || 0;
  const usedRugs = cards.reduce((s, c) => s + c.adults, 0);
  const usedChildren = cards.reduce((s, c) => s + c.children, 0);
  const remainingRugs = Math.max(0, totalRugs - usedRugs);
  const remainingChildren = Math.max(0, maxChildren - usedChildren);

  const totalSelectedSketches = cards.reduce((s, c) => s + c.sketches.length, 0);
  const aiEnabled = isAiTestModeEnabled();

  // Bulk 90cm upgrade tracking — based on already-saved selections only, so
  // the banner appears only after the user confirms via "אישור ושמירה", not
  // while a size is merely being edited (unsaved) inside the review modal.
  const allPendingUpgrades = useMemo(() => {
    return (selections || [])
      .filter(selectionWants90Upgrade)
      .map(s => ({
        rugIndex: s.rugIndex,
        productId: s.productId,
        productSnapshot: { title: s.productSnapshot?.title, image: s.productSnapshot?.image },
        canvasSize: '90x90',
        participantId: s.participantId || null,
        participantName: s.participantName,
      }));
  }, [selections]);

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

  // Safety net: if groups arrive/refresh from the backend after the initial
  // mount (e.g. slow context load) and aren't reflected in local state yet,
  // merge them in without dropping any not-yet-persisted local sketches.
  useEffect(() => {
    (participants || []).forEach(p => {
      if (seededParticipantIdsRef.current.has(p._id)) return;
      seededParticipantIdsRef.current.add(p._id);
      setCards(prev => {
        if (prev.some(c => c.participantId === p._id)) return prev;
        const mySelections = (selections || []).filter(s => s.participantId === p._id);
        return [...prev, {
          id: p._id,
          participantId: p._id,
          name: p.name,
          adults: p.rugAllowance || 1,
          children: p.childrenCount || 0,
          sketches: mySelections.map(mapSelectionToSketch),
        }];
      });
    });
  }, [participants, selections]);

  function mapSelectionToSketch(s) {
    return {
      productId: s.productId,
      title: s.productSnapshot?.title || s.title || 'סקיצה',
      image: s.productSnapshot?.image || null,
      size: getSelectionDisplaySize(s),
      source: s.source || 'catalog',
      rugIndex: s.rugIndex,
      upgradePaymentStatus: s.upgradePaymentStatus || null,
      ...(s.source === 'ai' ? {
        aiOriginalImage: s.aiOriginalImage || null,
        aiColors: s.aiColors || null,
        aiTaskId: s.aiTaskId || null,
      } : {}),
    };
  }

  // Groups are persisted immediately as WorkshopParticipants records (created
  // via onCreateGroup with mode='organizer') so a group's name/adults/children
  // survive a page refresh even before any sketch has been picked for it.
  // Selections are matched back to their group via participantId.
  function buildInitialCards(parts, sels) {
    const selsByParticipant = {};
    const selsByName = {};
    (sels || []).forEach(s => {
      if (s.participantId) {
        (selsByParticipant[s.participantId] ||= []).push(s);
      } else {
        const key = s.participantName || '__default__';
        (selsByName[key] ||= []).push(s);
      }
    });

    if (parts && parts.length) {
      return parts.map((p, idx) => ({
        id: p._id,
        participantId: p._id,
        name: p.name || `קבוצה ${idx + 1}`,
        adults: p.rugAllowance || 1,
        children: p.childrenCount || 0,
        sketches: (selsByParticipant[p._id] || []).map(mapSelectionToSketch),
      }));
    }

    // Legacy fallback for groups created before organizer groups were
    // persisted server-side (adults inferred from sketch count, children lost).
    return Object.entries(selsByName).map(([name, items], idx) => ({
      id: `legacy_${idx}`,
      participantId: null,
      name: name === '__default__' ? `קבוצה ${idx + 1}` : name,
      adults: items.length,
      children: 0,
      sketches: items.map(mapSelectionToSketch),
    }));
  }

  const openSetup = () => {
    if (remainingRugs <= 0) return;
    setSetupAdults(1);
    setSetupChildren(0);
    setSetupOpen(true);
  };

  const confirmSetup = async () => {
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
    setSetupCreating(true);
    try {
      const name = `קבוצה ${cards.length + 1}`;
      const created = onCreateGroup
        ? await onCreateGroup({ name, participants: setupAdults, children: effectiveChildren })
        : null;
      const newCard = created ? {
        id: created._id,
        participantId: created._id,
        name: created.name || name,
        adults: created.rugAllowance || setupAdults,
        children: created.childrenCount || effectiveChildren,
        sketches: [],
      } : {
        id: `card_${Date.now()}`,
        participantId: null,
        name,
        adults: setupAdults,
        children: effectiveChildren,
        sketches: [],
      };
      if (created?._id) seededParticipantIdsRef.current.add(created._id);
      setCards(prev => [...prev, newCard]);
      setSetupOpen(false);
      setSourceCardIdx(cards.length);
      setSourceOpen(true);
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg.startsWith('RUG_LIMIT_EXCEEDED')) setSetupError('אין מספיק שטיחים פנויים');
      else if (msg.startsWith('CHILDREN_LIMIT_EXCEEDED')) setSetupError('אין מספיק מקומות לילדים');
      else setSetupError('יצירת הקבוצה נכשלה, נסו שוב');
    } finally {
      setSetupCreating(false);
    }
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
      setAiModalCardIdx(sourceCardIdx);
      setAiModalOpen(true);
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

  const handleAISketchApproved = useCallback((sketch) => {
    if (aiModalCardIdx == null) return;
    setCards(prev => {
      const rugIndex = getNextRugIndex(prev);
      return prev.map((c, i) => {
        if (i !== aiModalCardIdx) return c;
        return {
          ...c,
          sketches: [...c.sketches, {
            productId: null,
            title: sketch.title || 'עיצוב מותאם אישית (AI)',
            image: sketch.image || null,
            size: sketch.canvasSize || '60x60',
            source: 'ai',
            rugIndex,
            aiOriginalImage: sketch.aiOriginalImage || null,
            aiColors: sketch.aiColors || null,
            aiTaskId: sketch.aiTaskId || null,
          }],
        };
      });
    });
    setAiModalOpen(false);
    setReviewCardIdx(aiModalCardIdx);
    setReviewError('');
    setReviewOpen(true);
  }, [aiModalCardIdx, getNextRugIndex]);

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

  const closeReview = () => {
    setReviewOpen(false);
    setEditingNameIdx(null);
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
      const selData = {
        rugIndex: sketch.rugIndex,
        productId: sketch.productId,
        productSnapshot: { title: sketch.title, image: sketch.image },
        canvasSize: sketch.size || '60x60',
        participantId: card.participantId || null,
        participantName: card.name,
        ...(sketch.source === 'ai' ? {
          source: 'ai',
          aiOriginalImage: sketch.aiOriginalImage,
          aiColors: sketch.aiColors,
          aiTaskId: sketch.aiTaskId,
        } : {}),
      };
      await onSelectSketch(selData);
    }

    closeReview();
    setExpandedCards(prev => ({ ...prev, [reviewCardIdx]: true }));
  };

  const toggleExpand = (idx) => {
    setExpandedCards(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const deleteCard = async (idx) => {
    const card = cards[idx];
    if (!card) return;

    setDeletingCard(true);
    setDeleteError('');
    try {
      if (onDeleteOrganizerGroup) {
        const rugIndexes = card.sketches.map(s => s.rugIndex).filter(i => i != null);
        await onDeleteOrganizerGroup({
          participantName: card.name,
          rugIndexes,
          participantId: card.participantId || null,
        });
      }
      setCards(prev => prev.filter((_, i) => i !== idx));
      setDeleteConfirmIdx(null);
    } catch (e) {
      setDeleteError('מחיקת הקבוצה נכשלה, נסו שוב');
    } finally {
      setDeletingCard(false);
    }
  };

  const startEditName = (idx) => {
    setEditNameValue(cards[idx]?.name || '');
    setEditingNameIdx(idx);
  };

  const saveEditName = async () => {
    if (editingNameIdx == null || editNameValue.trim().length < 1) return;
    const trimmed = editNameValue.trim();
    const card = cards[editingNameIdx];
    setCards(prev => prev.map((c, i) =>
      i === editingNameIdx ? { ...c, name: trimmed } : c
    ));
    setEditingNameIdx(null);
    if (card?.participantId && onUpdateParticipant) {
      try { await onUpdateParticipant(card.participantId, { name: trimmed }); } catch (e) {}
    }
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
          {remainingRugs === 0 && usedRugs > 0 && (
            <p className="text-[13px] text-green-600 font-semibold mt-0.5 flex items-center justify-center">
              <Check className="w-3.5 h-3.5" />
            </p>
          )}
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
        // A card is only truly "done" once any 90x90 upgrade on it has been paid.
        const hasUnpaidUpgrade = card.sketches.some(s => s.size === '90x90' && s.upgradePaymentStatus !== 'paid');
        const showComplete = complete && !hasUnpaidUpgrade;

        return (
          <div
            key={card.id}
            className={`bg-white rounded-xl border-2 p-3.5 transition-all ${
              showComplete ? 'border-green-200' : 'border-[#e8e8e8]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  showComplete ? 'bg-green-100 text-green-700' : 'bg-[#f5f0fa] text-[#5E2F88]'
                }`}>
                  {showComplete ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span className="text-[15px] font-semibold text-[#581E83] truncate">{card.name}</span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  showComplete ? 'bg-green-100 text-green-700' : picked > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${showComplete ? 'bg-green-500' : picked > 0 ? 'bg-orange-500' : 'bg-red-500'}`} />
                  {showComplete ? 'הושלם' : complete ? 'ממתין לתשלום' : picked > 0 ? 'חלקי' : 'ממתין'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openReview(idx)}
                  className="flex items-center gap-1 text-[11px] font-medium text-[#5E2F88] bg-[#f5f0fa] hover:bg-[#ebe0f5] px-2 py-1 rounded-lg transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  עריכה
                </button>
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
                            <EnlargeableSketchImage
                              src={sketch.image}
                              alt={sketch.title}
                              thumbClassName="w-10 h-10"
                            />
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
                disabled={setupCreating}
                className="w-full flex items-center justify-center gap-2 bg-[#5E2F88] hover:bg-[#7B3DB0] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-[15px] transition-colors"
              >
                {setupCreating ? 'יוצר קבוצה...' : 'המשך לבחירת סקיצה'}
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
                  disabled={!aiEnabled}
                  onClick={() => aiEnabled && chooseSource('ai')}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-right relative ${
                    aiEnabled
                      ? 'border-[#e8e8e8] bg-white hover:border-purple-300 hover:bg-purple-50'
                      : 'border-[#e8e8e8] bg-gray-50 opacity-70 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    aiEnabled ? 'bg-purple-100' : 'bg-gray-100'
                  }`}>
                    <Sparkles className={`w-5 h-5 ${aiEnabled ? 'text-purple-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[16px] font-semibold ${aiEnabled ? 'text-[#464646]' : 'text-[#464646]/50'}`}>
                        רוצה לתפור משהו משלי
                      </span>
                      {!aiEnabled && (
                        <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">בקרוב</span>
                      )}
                    </div>
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
              onClick={closeReview}
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
                <button type="button" onClick={closeReview} className="absolute top-3 left-3 text-[#464646]/50 hover:text-[#464646]">
                  <X className="w-5 h-5" />
                </button>

                <div className="text-center">
                  {editingNameIdx === reviewCardIdx ? (
                    <div className="flex items-center gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        placeholder="שם הקבוצה"
                        className="border-2 border-[#5E2F88] rounded-xl px-3 py-1.5 text-[15px] text-[#464646] outline-none transition-colors max-w-[180px]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={saveEditName}
                        disabled={editNameValue.trim().length < 1}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#5E2F88] hover:bg-[#7B3DB0] disabled:opacity-50 text-white transition-colors shrink-0"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingNameIdx(null)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#464646]/50 hover:text-[#464646] hover:bg-[#fafafa] transition-colors shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-[19px] font-bold text-[#581E83] flex items-center justify-center gap-1.5">
                      סיכום בחירות — {card.name}
                      <button
                        type="button"
                        onClick={() => startEditName(reviewCardIdx)}
                        className="text-[#5E2F88]/60 hover:text-[#5E2F88] transition-colors"
                        title="עריכת שם"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </h3>
                  )}
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
                      onClick={() => { closeReview(); openSourceFor(reviewCardIdx); }}
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
                          <EnlargeableSketchImage
                            src={sketch.image}
                            alt={sketch.title}
                            thumbClassName="w-12 h-12"
                            title={sketch.title}
                          />
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
                    onClick={() => { closeReview(); openSourceFor(reviewCardIdx); }}
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
                  {deleteError && (
                    <p className="text-[13px] text-red-600 text-center">{deleteError}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmIdx(null)}
                    disabled={deletingCard}
                    className="flex-1 py-2.5 rounded-xl border-2 border-[#e8e8e8] text-[14px] font-medium text-[#464646] hover:bg-[#fafafa] transition-colors disabled:opacity-50"
                  >
                    ביטול
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCard(deleteConfirmIdx)}
                    disabled={deletingCard}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[14px] font-medium transition-colors"
                  >
                    {deletingCard ? 'מוחק...' : 'מחיקה'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {catalogLoading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-[#5E2F88]">
          <div className="w-4 h-4 border-2 border-[#5E2F88] border-t-transparent rounded-full animate-spin" />
          טוען קטלוג...
        </div>
      )}

      <AISketchModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onApprove={handleAISketchApproved}
        onValidateImage={onValidateImage}
        onGenerateSketch={onGenerateSketch}
        onSaveApprovedSketch={onSaveApprovedSketch}
        onSubmitFeedback={onSubmitFeedback}
        onCheckRateLimit={onCheckRateLimit}
      />
    </div>
  );
}
