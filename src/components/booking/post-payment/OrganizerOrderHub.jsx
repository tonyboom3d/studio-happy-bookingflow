import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Check, UserCheck, Send, Copy, Settings, ChevronDown, ChevronUp,
  Calendar, MapPin, Tag, CreditCard, CalendarPlus, MessageCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
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
  isSaving,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);

  const workshopDate = order.workshopStart
    ? format(new Date(order.workshopStart), 'EEEE, d בMMMM yyyy', { locale: he })
    : null;

  const workshopTime = order.workshopStart
    ? format(new Date(order.workshopStart), 'HH:mm')
    : null;

  const allRugSlots = Array.from({ length: order.rugCount }, (_, i) => ({
    rugIndex: i,
    participantName: null,
  }));

  const copyLink = (link, id) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(id);
      setTimeout(() => setCopiedLink(null), 2000);
    });
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
      {/* Order header — compact */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-2.5 text-center"
      >
        <div className="w-9 h-9 rounded-full bg-[#5E2F88] flex items-center justify-center shrink-0">
          <Check className="w-5 h-5 text-white" />
        </div>
        <div className="text-right">
          <h1 className="text-lg font-bold text-[#581E83] leading-tight">ההזמנה בוצעה בהצלחה!</h1>
          <p className="text-xs text-[#464646]/60 leading-tight">
            עכשיו נשאר לבחור סקיצות
            {ecomSummary?.orderNumber && ` · הזמנה ${ecomSummary.orderNumber}`}
          </p>
        </div>
      </motion.div>

      {/* Order summary card */}
      <div className="bg-white rounded-2xl border border-[#e8e8e8] p-3.5 shadow-sm space-y-2">
        {/* Workshop name */}
        {ecomSummary?.workshopName && (
          <h3 className="text-sm font-bold text-[#581E83] leading-snug">{ecomSummary.workshopName}</h3>
        )}

        {/* Date & time + location in one row when possible */}
        {workshopDate && (
          <div className="flex items-start gap-1.5 text-xs text-[#464646]">
            <Calendar className="w-3.5 h-3.5 text-[#5E2F88] shrink-0 mt-0.5" />
            <span>
              {workshopDate}
              {workshopTime && <span className="text-[#5E2F88] font-medium mr-1.5">בשעה {workshopTime}</span>}
            </span>
          </div>
        )}

        {ecomSummary?.location && (
          <div className="flex items-start gap-1.5 text-xs text-[#464646]">
            <MapPin className="w-3.5 h-3.5 text-[#5E2F88] shrink-0 mt-0.5" />
            <span>{ecomSummary.location}</span>
          </div>
        )}

        {/* Participants + sketch progress in one compact row */}
        <div className="flex items-center justify-between gap-2 text-xs text-[#464646]">
          <span className="flex items-center gap-1.5 min-w-0">
            <UserCheck className="w-3.5 h-3.5 text-[#5E2F88] shrink-0" />
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

        {/* Price — total only, with discount inline */}
        {ecomSummary && (
          <div className="border-t border-[#e8e8e8] pt-2 mt-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-[#464646]">
              <CreditCard className="w-3.5 h-3.5 text-[#5E2F88]" />
              סה״כ שולם
              {(hasCoupon || hasDiscount) && (
                <span className="text-green-700 flex items-center gap-0.5">
                  <Tag className="w-3 h-3" />
                  {hasCoupon ? ecomSummary.coupon.code : 'הנחה'} -₪{ecomSummary.discount}
                </span>
              )}
            </span>
            <span className="text-base font-bold text-[#581E83] tabular-nums">₪{ecomSummary.total}</span>
          </div>
        )}

        {/* WhatsApp sent notice — compact single line inside the card */}
        {organizerPhone && (
          <div className="border-t border-[#e8e8e8] pt-2 flex items-center gap-1.5 text-[11px] text-green-700">
            <MessageCircle className="w-3.5 h-3.5 shrink-0 text-green-600" />
            <span className="truncate">
              פרטי ההזמנה נשלחו אליך בוואטסאפ ל-
              <span className="font-semibold" dir="ltr">{formatPhone(organizerPhone)}</span>
            </span>
          </div>
        )}
      </div>

      {/* Add to Calendar button */}
      {calendarUrl && (
        <a
          href={calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full border border-[#5E2F88] text-[#5E2F88] hover:bg-[#5E2F88] hover:text-white font-medium py-2 rounded-xl text-xs transition-colors"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          הוספה ליומן Google
        </a>
      )}

      <DeadlineCountdown
        deadlineAt={order.deadlineAt}
        rugCount={order.rugCount}
        participantCount={participantCount}
      />

      {/* Selection mode — always switchable */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-[#581E83] text-center">
          מי בוחר את הסקיצות?
        </h3>
        <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => onChooseMode('organizer')}
            disabled={isSaving}
            className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-right ${
              order.selectionMode === 'organizer'
                ? 'border-[#5E2F88] bg-[#f5f0fa] shadow-md'
                : 'border-[#e8e8e8] bg-white hover:border-[#5E2F88]/50'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              order.selectionMode === 'organizer' ? 'bg-[#5E2F88]' : 'bg-[#f5f0fa]'
            }`}>
              <UserCheck className={`w-4 h-4 ${order.selectionMode === 'organizer' ? 'text-white' : 'text-[#5E2F88]'}`} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-[#581E83]">אבחר בעצמי</h4>
              <p className="text-[10px] text-[#464646]/60 leading-tight">לכל השטיחים</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChooseMode('participants')}
            disabled={isSaving}
            className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-right ${
              order.selectionMode === 'participants'
                ? 'border-[#5E2F88] bg-[#f5f0fa] shadow-md'
                : 'border-[#e8e8e8] bg-white hover:border-[#5E2F88]/50'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              order.selectionMode === 'participants' ? 'bg-[#5E2F88]' : 'bg-[#f5f0fa]'
            }`}>
              <Send className={`w-4 h-4 ${order.selectionMode === 'participants' ? 'text-white' : 'text-[#5E2F88]'}`} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-[#581E83]">שליחה לקבוצה</h4>
              <p className="text-[10px] text-[#464646]/60 leading-tight">כל אחד יבחר</p>
            </div>
          </button>
        </div>
      </div>

      {/* Organizer picks all sketches */}
      {order.selectionMode === 'organizer' && (
        <SketchSelectionView
          rugSlots={allRugSlots}
          catalog={catalog}
          workshopStart={order.workshopStart}
          onSelectSketch={onSelectSketch}
          onRequestUpgrade={onRequestUpgrade}
          existingSelections={selections}
        />
      )}

      {/* Participants mode: setup form or links */}
      {order.selectionMode === 'participants' && !participants?.length && (
        <ParticipantSetupForm
          rugCount={order.rugCount}
          childrenCount={order.children || 0}
          onSave={onSaveParticipants}
          isSaving={isSaving}
        />
      )}

      {order.selectionMode === 'participants' && participants?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-[#581E83]">משתתפים וקישורים</h3>

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

          {participants.map((p, i) => {
            const link = participantLinks?.find(l => l.participantId === p._id);
            const pSelections = selections?.filter(s => s.participantId === p._id) || [];
            const completed = pSelections.length >= (p.rugAllowance || 1);

            return (
              <div
                key={p._id || i}
                className="border border-[#e8e8e8] rounded-xl p-3 flex items-center gap-3 bg-white"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  completed ? 'bg-green-100 text-green-700' : 'bg-[#f5f0fa] text-[#5E2F88]'
                }`}>
                  {completed ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#581E83] truncate">{p.name}</p>
                  <p className="text-xs text-[#464646]/50">
                    {p.rugAllowance} {p.rugAllowance === 1 ? 'שטיח' : 'שטיחים'}
                    {p.hasChildren && ' • עם ילדים'}
                    {completed && ' • הושלם'}
                  </p>
                </div>
                {link && (
                  <button
                    type="button"
                    onClick={() => copyLink(link.link, p._id)}
                    className="text-[#5E2F88] hover:text-[#7B3DB0] transition-colors"
                    title="העתק קישור"
                  >
                    {copiedLink === p._id ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Settings */}
      <div className="border border-[#e8e8e8] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between p-3 text-sm font-medium text-[#581E83] hover:bg-[#fafafa] transition-colors"
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
              <span className="text-sm text-[#464646]">הצגת עלות הסדנה למשתתפים</span>
              <input
                type="checkbox"
                checked={order.showPriceToParticipants || false}
                onChange={(e) => onUpdateSettings({ showPriceToParticipants: e.target.checked })}
                className="w-4 h-4 accent-[#5E2F88]"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-[#464646]">הצגת סקיצות שבחרו אחרים</span>
              <input
                type="checkbox"
                checked={order.showOtherSelections !== false}
                onChange={(e) => onUpdateSettings({ showOtherSelections: e.target.checked })}
                className="w-4 h-4 accent-[#5E2F88]"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-[#464646]">התראה כשמשתתף משלים בחירה</span>
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
}
