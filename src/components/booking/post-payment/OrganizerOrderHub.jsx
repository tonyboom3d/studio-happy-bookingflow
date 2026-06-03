import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, UserCheck, Send, Copy, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import DeadlineCountdown from './DeadlineCountdown';
import ParticipantSetupForm from './ParticipantSetupForm';
import SketchSelectionView from './SketchSelectionView';

export default function OrganizerOrderHub({
  order,
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
  const totalRuds = order.rugCount;

  return (
    <div className="py-4 space-y-6" dir="rtl">
      {/* Order header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-16 h-16 rounded-full bg-[#5E2F88] flex items-center justify-center mx-auto mb-3">
          <Check className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[#581E83]">ההזמנה בוצעה בהצלחה!</h1>
        <p className="text-sm text-[#464646]/70 mt-1">
          עכשיו נשאר לבחור סקיצות לשטיחים
        </p>
      </motion.div>

      {/* Order summary card */}
      <div className="bg-white rounded-2xl border border-[#e8e8e8] p-4 shadow-sm space-y-2">
        {workshopDate && (
          <div className="text-sm text-[#464646]">
            <span className="font-medium text-[#581E83]">מועד הסדנה:</span> {workshopDate}
          </div>
        )}
        <div className="text-sm text-[#464646]">
          <span className="font-medium text-[#581E83]">משתתפים:</span> {order.adults} מבוגרים
          {order.children > 0 && `, ${order.children} ילדים`}
        </div>
        <div className="text-sm text-[#464646]">
          <span className="font-medium text-[#581E83]">שטיחים:</span> {order.rugCount}
        </div>
        <div className="text-sm text-[#464646]">
          <span className="font-medium text-[#581E83]">בחירת סקיצות:</span>{' '}
          <span className={selectionProgress === totalRuds ? 'text-green-600' : 'text-orange-600'}>
            {selectionProgress}/{totalRuds} הושלמו
          </span>
        </div>
      </div>

      <DeadlineCountdown deadlineAt={order.deadlineAt} />

      {/* Selection mode choice */}
      {!order.selectionMode && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-[#581E83] text-center">
            מי בוחר את הסקיצות?
          </h3>
          <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => onChooseMode('organizer')}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-[#e8e8e8] hover:border-[#5E2F88] bg-white hover:shadow-md transition-all text-right"
            >
              <div className="w-10 h-10 rounded-full bg-[#f5f0fa] flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5 text-[#5E2F88]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#581E83]">אבחר בעצמי לכולם</h4>
                <p className="text-xs text-[#464646]/60 mt-0.5">אני אבחר את הסקיצות לכל השטיחים</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChooseMode('participants')}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-[#e8e8e8] hover:border-[#5E2F88] bg-white hover:shadow-md transition-all text-right"
            >
              <div className="w-10 h-10 rounded-full bg-[#f5f0fa] flex items-center justify-center shrink-0">
                <Send className="w-5 h-5 text-[#5E2F88]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#581E83]">לשלוח לחברי הקבוצה</h4>
                <p className="text-xs text-[#464646]/60 mt-0.5">כל משתתף יבחר את הסקיצה שלו בעצמו</p>
              </div>
            </button>
          </div>
        </div>
      )}

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
