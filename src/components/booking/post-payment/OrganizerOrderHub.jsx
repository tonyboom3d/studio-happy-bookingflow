import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Check, UserCheck, Send, Copy, Settings, ChevronDown, ChevronUp,
  Calendar, MapPin, Tag, CreditCard, CalendarPlus, MessageCircle,
  HelpCircle, X, ExternalLink, User, Mail, Phone, MoveLeft, Baby, Plus, Minus, Image as ImageIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import DeadlineCountdown from './DeadlineCountdown';
import ParticipantSetupForm from './ParticipantSetupForm';
import SketchSelectionView from './SketchSelectionView';

export default function OrganizerOrderHub({
  order,
  ecomSummary,
  catalog,
  participants,
  selections,
  participantLinks,
  onChooseMode,
  onSaveParticipants,
  onGenerateLinks,
  onSelectSketch,
  onRequestUpgrade,
  onUpdateSettings,
  onFetchCatalog,
  isSaving,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [modeChosen, setModeChosen] = useState(false);
  const [orderDetailsCollapsed, setOrderDetailsCollapsed] = useState(false);
  const [participantsExpanded, setParticipantsExpanded] = useState(false);

  const handleModeClick = useCallback((mode) => {
    setModeChosen(true);
    setOrderDetailsCollapsed(true);
    onChooseMode(mode);
  }, [onChooseMode]);

  const workshopDate = order.workshopStart
    ? format(new Date(order.workshopStart), 'EEEE, d בMMMM yyyy', { locale: he })
    : null;

  const workshopStartTime = order.workshopStart
    ? format(new Date(order.workshopStart), 'HH:mm')
    : null;

  const workshopEndTime = order.workshopStart
    ? format(new Date(new Date(order.workshopStart).getTime() + 4 * 60 * 60 * 1000), 'HH:mm')
    : null;

  const displayAddress = 'הדובדבן 7, קריית אונו - קומה 3';

  const whatsappText = encodeURIComponent(
    `שלום! ביצעתי הרגע הזמנה על שם ${ecomSummary?.buyerName || ''}, מספר ההזמנה שלי הוא ${ecomSummary?.orderNumber || ''}`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?phone=972522272270&text=${whatsappText}`;

  const allRugSlots = Array.from({ length: order.rugCount }, (_, i) => ({
    rugIndex: i,
    participantName: null,
  }));

  const USER_SELECTIONS_BASE = 'https://www.studiohappy.art/user-selections';

  // Build the dedicated group selection link routing to the /user-selections page.
  const buildGroupShareUrl = useCallback((token) => {
    const params = new URLSearchParams();
    if (order?._id) params.set('orderId', order._id);
    if (token) params.set('token', token);
    return `${USER_SELECTIONS_BASE}?${params.toString()}`;
  }, [order?._id]);

  const buildShareMessage = useCallback((token) => {
    const wsName = ecomSummary?.workshopName || 'סדנת טאפטינג - סטודיו האפי';
    const datePart = workshopDate || '';
    const timePart = workshopStartTime || '';
    const url = buildGroupShareUrl(token);
    return (
      `היי, הזמנתי לנו ${wsName}` +
      (datePart ? ` בתאריך ${datePart}` : '') +
      (timePart ? ` בשעה ${timePart}` : '') +
      ` - כל מה שנשאר לך זה לבחור סקיצה שתרצה/י לתפוף בקישור הבא:\n` +
      `${url}\n\n` +
      `לתשומת לבך, ניתן לבחור סקיצה עד 48 שעות לפני מועד הסדנה!`
    );
  }, [ecomSummary, workshopDate, workshopStartTime, buildGroupShareUrl]);

  const copyLink = (token, id) => {
    const url = buildGroupShareUrl(token);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(id);
      setTimeout(() => setCopiedLink(null), 2000);
    });
  };

  const shareViaWhatsApp = (token) => {
    const text = encodeURIComponent(buildShareMessage(token));
    const waUrl = `https://api.whatsapp.com/send?text=${text}`;
    try { window.open(waUrl, '_blank', 'noopener,noreferrer'); } catch (_) {}
  };

  const selectionProgress = selections?.length || 0;
  const totalRugs = order.rugCount;

  const calendarUrl = useMemo(() => {
    if (!order.workshopStart) return null;
    const start = new Date(order.workshopStart);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const title = encodeURIComponent(ecomSummary?.workshopName || 'סדנת טאפטינג - סטודיו האפי');
    const location = encodeURIComponent(ecomSummary?.location || '');
    const details = encodeURIComponent(
      `${order.adults} מבוגרים` +
      (order.children > 0 ? `, ${order.children} ילדים` : '') +
      `, ${order.rugCount} שטיחים`
    );
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&location=${location}&details=${details}`;
  }, [order, ecomSummary]);

  const hasCoupon = !!ecomSummary?.coupon;
  const hasDiscount = ecomSummary?.discount > 0;

  const organizerPhone = order.organizerPhone || ecomSummary?.buyerPhone || '';
  const formatPhone = (phone) => {
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return phone;
  };

  const participantCount = order.adults || 1;

  return (
    <div className="py-3 space-y-3" dir="rtl">
      {/* Order header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-2.5 text-center"
      >
        <div className="w-9 h-9 rounded-full bg-[#5E2F88] flex items-center justify-center shrink-0">
          <Check className="w-5 h-5 text-white" />
        </div>
        <div className="text-right">
          <h1 className="text-[22px] font-bold text-[#581E83] leading-tight">ההזמנה בוצעה בהצלחה!</h1>
          <p className="text-[15px] text-[#464646]/60 leading-tight">
            עכשיו נשאר לבחור סקיצות
            {ecomSummary?.orderNumber && ` · הזמנה ${ecomSummary.orderNumber}`}
          </p>
          {organizerPhone && (
            <p className="text-[13px] text-green-700 flex items-center gap-1 mt-1">
              <MessageCircle className="w-3.5 h-3.5 shrink-0 text-green-600" />
              <span className="truncate">
                פרטי ההזמנה נשלחו אליך בוואטסאפ ל-
                <span className="font-semibold" dir="ltr">{formatPhone(organizerPhone)}</span>
              </span>
            </p>
          )}
        </div>
      </motion.div>

      {/* Expand toggle — visible only when collapsed */}
      <AnimatePresence>
        {orderDetailsCollapsed && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            type="button"
            onClick={() => setOrderDetailsCollapsed(false)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[13px] font-medium text-[#464646]/60 hover:text-[#5E2F88] transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
            הצג פרטי הזמנה
          </motion.button>
        )}
      </AnimatePresence>

      {/* Collapsible order details block */}
      <AnimatePresence initial={false}>
        {!orderDetailsCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-3">
              {/* Workshop & customer details — merged card */}
              <div className="bg-white rounded-2xl border border-[#e8e8e8] p-3.5 shadow-sm space-y-2.5">
                <div className="sm:grid sm:grid-cols-2 sm:gap-4">
                  {/* Column 1: Workshop details */}
                  <div className="space-y-2">
                    {ecomSummary?.workshopName && (
                      <h3 className="text-lg font-bold text-[#581E83] leading-snug">{ecomSummary.workshopName}</h3>
                    )}
                    {workshopDate && (
                      <div className="flex items-start gap-1.5 text-[15px] text-[#464646]">
                        <Calendar className="w-4 h-4 text-[#5E2F88] shrink-0 mt-0.5" />
                        <span>
                          {workshopDate}
                          {workshopStartTime && (
                            <span className="text-[#5E2F88] font-medium mr-1.5">
                              בשעה {workshopStartTime}{workshopEndTime && ` - ${workshopEndTime}`}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-1.5 text-[15px] text-[#464646]">
                      <MapPin className="w-4 h-4 text-[#5E2F88] shrink-0 mt-0.5" />
                      <span>{displayAddress}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[15px] text-[#464646]">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <UserCheck className="w-4 h-4 text-[#5E2F88] shrink-0" />
                        <span className="truncate">
                          {order.adults} {order.adults === 1 ? 'מבוגר' : 'מבוגרים'}
                          {order.children > 0 && ` + ${order.children} ${order.children === 1 ? 'ילד' : 'ילדים'}`}
                          {' · '}{order.rugCount} {order.rugCount === 1 ? 'שטיח' : 'שטיחים'}
                        </span>
                      </span>
                      <span className={`shrink-0 font-medium ${selectionProgress === totalRugs ? 'text-green-600' : 'text-orange-600'}`}>
                        {selectionProgress}/{totalRugs} נבחרו
                      </span>
                    </div>
                  </div>

                  {/* Column 2: Customer details — collapsible on mobile */}
                  {ecomSummary && (
                    <div className="sm:border-r sm:border-[#e8e8e8] sm:pr-4">
                      <button
                        type="button"
                        onClick={() => setDetailsExpanded(!detailsExpanded)}
                        className="sm:hidden flex items-center gap-1.5 mt-2.5 text-[15px] font-semibold text-[#581E83] w-full"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${detailsExpanded ? 'rotate-180' : ''}`} />
                        פרטי המזמין
                      </button>
                      <h4 className="hidden sm:block text-[15px] font-semibold text-[#581E83] mb-2">פרטי המזמין</h4>
                      <div className={`space-y-1.5 overflow-hidden transition-all sm:!max-h-none sm:!opacity-100 sm:!mt-0 ${detailsExpanded ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0 sm:max-h-none sm:opacity-100'}`}>
                        {ecomSummary.buyerName && (
                          <div className="flex items-center gap-2 text-[15px] text-[#464646]">
                            <User className="w-4 h-4 text-[#5E2F88] shrink-0" />
                            <span className="font-medium">{ecomSummary.buyerName}</span>
                          </div>
                        )}
                        {ecomSummary.buyerEmail && (
                          <div className="flex items-center gap-2 text-[15px] text-[#464646]">
                            <Mail className="w-4 h-4 text-[#5E2F88] shrink-0" />
                            <span dir="ltr" className="text-left truncate">{ecomSummary.buyerEmail}</span>
                          </div>
                        )}
                        {ecomSummary.buyerPhone && (
                          <div className="flex items-center gap-2 text-[15px] text-[#464646]">
                            <Phone className="w-4 h-4 text-[#5E2F88] shrink-0" />
                            <span dir="ltr" className="font-medium">{formatPhone(ecomSummary.buyerPhone)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Price — total only, with discount inline */}
                {ecomSummary && (
                  <div className="border-t border-[#e8e8e8] pt-2 mt-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[15px] text-[#464646]">
                      <CreditCard className="w-4 h-4 text-[#5E2F88]" />
                      סה״כ שולם
                      {(hasCoupon || hasDiscount) && (
                        <span className="text-green-700 flex items-center gap-0.5">
                          <Tag className="w-3.5 h-3.5" />
                          {hasCoupon ? ecomSummary.coupon.code : 'הנחה'} -₪{ecomSummary.discount}
                        </span>
                      )}
                    </span>
                    <span className="text-xl font-bold text-[#581E83] tabular-nums">₪{ecomSummary.total}</span>
                  </div>
                )}
              </div>

              {/* Calendar + Contact buttons side by side */}
              <div className="grid grid-cols-2 gap-2">
                {calendarUrl && (
                  <a
                    href={calendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-[#5E2F88] hover:bg-[#7B3DB0] text-white font-medium py-2.5 rounded-xl text-[14px] transition-colors"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    הוספה ליומן
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="flex items-center justify-center gap-2 border-2 border-[#5E2F88] text-[#5E2F88] hover:bg-[#f5f0fa] font-medium py-2.5 rounded-xl text-[14px] transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  יש שאלה? צרו קשר
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeadlineCountdown
        deadlineAt={order.deadlineAt}
        rugCount={order.rugCount}
        participantCount={participantCount}
      />

      {/* Selection mode */}
      <div className="space-y-2">
        <h3 className="text-[17px] font-bold text-[#581E83] text-center flex items-center justify-center gap-2">
          מי בוחר את הסקיצות?
          <AnimatePresence>
            {!modeChosen && (
              <motion.span
                initial={{ opacity: 1, x: 0 }}
                animate={{ x: [0, -6, 0] }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ x: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }, exit: { duration: 0.2 } }}
              >
                <MoveLeft className="w-5 h-5 text-[#5E2F88]" />
              </motion.span>
            )}
          </AnimatePresence>
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleModeClick('organizer')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-right ${
              modeChosen && order.selectionMode === 'organizer'
                ? 'border-[#5E2F88] bg-[#f5f0fa] shadow-md'
                : 'border-[#e8e8e8] bg-white hover:border-[#5E2F88]/50'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              modeChosen && order.selectionMode === 'organizer' ? 'bg-[#5E2F88]' : 'bg-[#f5f0fa]'
            }`}>
              <UserCheck className={`w-4 h-4 ${modeChosen && order.selectionMode === 'organizer' ? 'text-white' : 'text-[#5E2F88]'}`} />
            </div>
            <div className="min-w-0">
              <h4 className="text-[15px] font-semibold text-[#581E83]">אבחר בעצמי</h4>
              <p className="text-[14px] text-[#464646]/60 leading-tight">לכל השטיחים</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleModeClick('participants')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-right ${
              modeChosen && order.selectionMode === 'participants'
                ? 'border-[#5E2F88] bg-[#f5f0fa] shadow-md'
                : 'border-[#e8e8e8] bg-white hover:border-[#5E2F88]/50'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              modeChosen && order.selectionMode === 'participants' ? 'bg-[#5E2F88]' : 'bg-[#f5f0fa]'
            }`}>
              <Send className={`w-4 h-4 ${modeChosen && order.selectionMode === 'participants' ? 'text-white' : 'text-[#5E2F88]'}`} />
            </div>
            <div className="min-w-0">
              <h4 className="text-[15px] font-semibold text-[#581E83]">שליחה לקבוצה</h4>
              <p className="text-[14px] text-[#464646]/60 leading-tight">כל אחד יבחר לעצמו</p>
            </div>
          </button>
        </div>
      </div>

      {/* Organizer picks all sketches */}
      {modeChosen && order.selectionMode === 'organizer' && (
        <SketchSelectionView
          rugSlots={allRugSlots}
          catalog={catalog}
          workshopStart={order.workshopStart}
          deadlineAt={order.deadlineAt}
          totalRugCount={order.rugCount}
          buyerName={ecomSummary?.buyerName}
          orderNumber={ecomSummary?.orderNumber}
          onSelectSketch={onSelectSketch}
          onRequestUpgrade={onRequestUpgrade}
          onFetchCatalog={onFetchCatalog}
          existingSelections={selections}
        />
      )}

      {/* Participants mode: loading while auto-generating */}
      {modeChosen && order.selectionMode === 'participants' && !participants?.length && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#5E2F88]">
          <div className="w-4 h-4 border-2 border-[#5E2F88] border-t-transparent rounded-full animate-spin" />
          מכין את רשימת המשתתפים...
        </div>
      )}

      {modeChosen && order.selectionMode === 'participants' && participants?.length > 0 && (() => {
        const visibleParticipants = participantsExpanded ? participants : participants.slice(0, 4);
        const hasHidden = participants.length > 4 && !participantsExpanded;
        const childrenInOrder = order.children || 0;

        return (
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-[#581E83]">משתתפים וקישורים</h3>

            {!participantLinks?.length && (
              <Button
                onClick={onGenerateLinks}
                disabled={isSaving}
                className="w-full bg-[#5E2F88] hover:bg-[#7B3DB0] text-white"
              >
                <Send className="w-4 h-4 ml-2" />
                יצירת קישורים ושליחה
              </Button>
            )}

            <div className="space-y-2.5 relative">
              {visibleParticipants.map((p, i) => {
                const link = participantLinks?.find(l => l.participantId === p._id);
                // Selections are keyed by rugIndex only — map card i -> rugIndex i.
                const mapped = selections?.find(s => s.rugIndex === i);
                const isSavedSelection = mapped && mapped.selectionStatus === 'selected'
                  && (mapped.canvasSize !== '90x90' || mapped.upgradePaymentStatus === 'paid');
                const completed = !!isSavedSelection;
                const childCount = p.childrenCount || (p.hasChildren ? 1 : 0);

                return (
                  <div
                    key={p._id || i}
                    className={`bg-white rounded-xl border-2 p-3.5 transition-all ${
                      completed ? 'border-green-200' : 'border-[#e8e8e8]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          completed ? 'bg-green-100 text-green-700' : 'bg-[#f5f0fa] text-[#5E2F88]'
                        }`}>
                          {completed ? <Check className="w-3.5 h-3.5" /> : i + 1}
                        </div>
                        <div>
                          <span className="text-[15px] font-semibold text-[#581E83]">{p.name}</span>
                          <span className="text-[13px] text-[#464646]/60 mr-1.5">
                            · {p.rugAllowance || 1} {(p.rugAllowance || 1) === 1 ? 'שטיח' : 'שטיחים'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {childrenInOrder > 0 && (
                          <div className="flex items-center gap-1">
                            <Baby className="w-3.5 h-3.5 text-[#5E2F88]" />
                            <button
                              type="button"
                              onClick={() => {
                                const current = p.childrenCount || 0;
                                if (current > 0) onUpdateSettings({ _updateParticipantChildren: { participantId: p._id, childrenCount: current - 1 } });
                              }}
                              disabled={!childCount}
                              className="w-5 h-5 rounded-full border border-[#e8e8e8] flex items-center justify-center text-[#5E2F88] hover:bg-[#f5f0fa] disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold text-[#581E83] tabular-nums w-4 text-center">{childCount}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const current = p.childrenCount || 0;
                                onUpdateSettings({ _updateParticipantChildren: { participantId: p._id, childrenCount: current + 1 } });
                              }}
                              className="w-5 h-5 rounded-full border border-[#e8e8e8] flex items-center justify-center text-[#5E2F88] hover:bg-[#f5f0fa]"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {link && (
                          <>
                            <button
                              type="button"
                              onClick={() => copyLink(link.token, p._id)}
                              className="text-[#5E2F88] hover:text-[#7B3DB0] transition-colors"
                              title="העתק קישור קבוצתי"
                            >
                              {copiedLink === p._id ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => shareViaWhatsApp(link.token)}
                              className="text-green-600 hover:text-green-700 transition-colors"
                              title="שיתוף בוואטסאפ"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Show the mapped sketch for this card (only fully saved selections) */}
                    {isSavedSelection && (() => {
                      const sStatus = mapped.sketchStatus || 'Changeable';
                      return (
                        <div className="flex items-center gap-2.5 bg-[#fafafa] rounded-lg p-2 mt-1.5">
                          {mapped.productSnapshot?.image && (
                            <img src={mapped.productSnapshot.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#581E83] truncate">{mapped.productSnapshot?.title || 'סקיצה'}</p>
                            <p className="text-[11px] text-[#464646]/50">
                              {mapped.canvasSize === '90x90' ? '90*90 ס"מ · ₪299' : '60*60 ס"מ'}
                              {' · '}{sStatus === 'In preparation' ? 'בהכנה' : sStatus === 'Ready' ? 'מוכנה' : 'ניתן לשינוי'}
                            </p>
                          </div>
                          <ImageIcon className="w-3.5 h-3.5 text-[#5E2F88]/40 shrink-0" />
                        </div>
                      );
                    })()}

                    {completed && (
                      <p className="text-[11px] text-green-600 font-medium mt-1.5 flex items-center gap-1">
                        <Check className="w-3 h-3" /> הושלם
                      </p>
                    )}
                  </div>
                );
              })}

              {hasHidden && (
                <div className="relative">
                  <div className="absolute inset-x-0 -top-16 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setParticipantsExpanded(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-[#5E2F88] hover:text-[#7B3DB0] transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                    הצג עוד {participants.length - 4} משתתפים
                  </button>
                </div>
              )}
              {participantsExpanded && participants.length > 4 && (
                <button
                  type="button"
                  onClick={() => setParticipantsExpanded(false)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-[#464646]/60 hover:text-[#5E2F88] transition-colors"
                >
                  <ChevronDown className="w-4 h-4 rotate-180" />
                  הצג פחות
                </button>
              )}
            </div>

            {/* Settings — only in participants mode, below participant cards */}
            <div className="border border-[#e8e8e8] rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="w-full flex items-center justify-between p-3 text-[17px] font-medium text-[#581E83] hover:bg-[#fafafa] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span>הגדרות</span>
                </div>
                {settingsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {settingsOpen && (
                <div className="p-3 pt-0 space-y-3 border-t border-[#e8e8e8]">
                  <label className="flex items-center justify-between">
                    <span className="text-[17px] text-[#464646]">הצגת עלות הסדנה למשתתפים</span>
                    <input
                      type="checkbox"
                      checked={order.showPriceToParticipants || false}
                      onChange={(e) => onUpdateSettings({ showPriceToParticipants: e.target.checked })}
                      className="w-4 h-4 accent-[#5E2F88]"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-[17px] text-[#464646]">הצגת סקיצות שבחרו אחרים</span>
                    <input
                      type="checkbox"
                      checked={order.showOtherSelections !== false}
                      onChange={(e) => onUpdateSettings({ showOtherSelections: e.target.checked })}
                      className="w-4 h-4 accent-[#5E2F88]"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-[17px] text-[#464646]">התראה כשמשתתף משלים בחירה</span>
                    <input
                      type="checkbox"
                      checked={order.notifyOnSelection !== false}
                      onChange={(e) => onUpdateSettings({ notifyOnSelection: e.target.checked })}
                      className="w-4 h-4 accent-[#5E2F88]"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Contact popup */}
      <AnimatePresence>
        {contactOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setContactOpen(false)}
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
              <button
                type="button"
                onClick={() => setContactOpen(false)}
                className="absolute top-3 left-3 text-[#464646]/50 hover:text-[#464646] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                <HelpCircle className="w-10 h-10 text-[#5E2F88] mx-auto mb-2" />
                <h3 className="text-[19px] font-bold text-[#581E83]">איך נוכל לעזור?</h3>
                <p className="text-[15px] text-[#464646]/70 mt-1">בחרו את הדרך הנוחה לכם</p>
              </div>

              <div className="space-y-3">
                <a
                  href="/faq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full p-3.5 rounded-xl border-2 border-[#5E2F88] bg-[#f5f0fa] hover:bg-[#ebe0f5] transition-colors text-right"
                >
                  <div className="w-10 h-10 rounded-full bg-[#5E2F88] flex items-center justify-center shrink-0">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[17px] font-semibold text-[#581E83]">שאלות נפוצות</span>
                      <span className="text-[11px] font-bold bg-[#5E2F88] text-white px-2 py-0.5 rounded-full">מומלץ</span>
                    </div>
                    <p className="text-[14px] text-[#464646]/60 mt-0.5">מצאו תשובות מהירות</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#5E2F88] shrink-0" />
                </a>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full p-3.5 rounded-xl border-2 border-[#e8e8e8] bg-white hover:border-green-400 hover:bg-green-50 transition-colors text-right"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[17px] font-semibold text-[#464646]">WhatsApp</span>
                    <p className="text-[14px] text-[#464646]/60 mt-0.5">שלחו לנו הודעה</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#464646]/40 shrink-0" />
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
