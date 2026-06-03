import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, AlertTriangle, Users, Baby } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 && digits.startsWith('05');
}

export default function ParticipantSetupForm({
  rugCount,
  onSave,
  isSaving,
}) {
  const [participants, setParticipants] = useState([
    { name: '', phone: '', rugAllowance: 1, hasChildren: false },
  ]);
  const [errors, setErrors] = useState({});
  const [duplicateWarnings, setDuplicateWarnings] = useState([]);
  const [duplicatesApproved, setDuplicatesApproved] = useState(false);

  const totalRugs = participants.reduce((sum, p) => sum + (p.rugAllowance || 1), 0);
  const rugsRemaining = rugCount - totalRugs;

  const addParticipant = () => {
    if (totalRugs >= rugCount) return;
    setParticipants(prev => [
      ...prev,
      { name: '', phone: '', rugAllowance: 1, hasChildren: false },
    ]);
  };

  const removeParticipant = (index) => {
    if (participants.length <= 1) return;
    setParticipants(prev => prev.filter((_, i) => i !== index));
    setErrors(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const updateField = (index, field, value) => {
    setParticipants(prev => prev.map((p, i) => {
      if (i !== index) return p;
      if (field === 'phone') {
        return { ...p, phone: value.replace(/\D/g, '').slice(0, 10) };
      }
      if (field === 'rugAllowance') {
        const num = Math.max(1, Math.min(rugCount, parseInt(value) || 1));
        return { ...p, rugAllowance: num };
      }
      return { ...p, [field]: value };
    }));
    setErrors(prev => ({ ...prev, [index]: undefined }));
    setDuplicatesApproved(false);
  };

  const duplicatePhones = useMemo(() => {
    const phones = participants.map(p => p.phone).filter(p => p.length >= 10);
    const seen = {};
    const dups = [];
    phones.forEach((phone, i) => {
      if (seen[phone] !== undefined) {
        dups.push({ indices: [seen[phone], i], phone });
      } else {
        seen[phone] = i;
      }
    });
    return dups;
  }, [participants]);

  const validate = () => {
    const newErrors = {};
    participants.forEach((p, i) => {
      const errs = [];
      if (!p.name.trim()) errs.push('שם הוא שדה חובה');
      if (!validatePhone(p.phone)) errs.push('מספר טלפון לא תקין');
      if (p.rugAllowance < 1) errs.push('כמות שטיחים חייבת להיות לפחות 1');
      if (errs.length > 0) newErrors[i] = errs;
    });

    if (totalRugs !== rugCount) {
      newErrors._global = [`סה"כ שטיחים חייב להיות ${rugCount} (כרגע: ${totalRugs})`];
    }

    setErrors(newErrors);

    if (duplicatePhones.length > 0 && !duplicatesApproved) {
      setDuplicateWarnings(duplicatePhones);
      return false;
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSave(participants);
    }
  };

  return (
    <div className="py-4 space-y-4" dir="rtl">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-[#581E83]">הגדרת משתתפים</h3>
        <p className="text-sm text-[#464646]/70 mt-1">
          הזן שם, מספר טלפון וכמות שטיחים לכל משתתף
        </p>
      </div>

      <div className="flex items-center justify-between bg-[#f5f0fa] rounded-lg px-3 py-2 text-sm">
        <span className="text-[#581E83] font-medium">
          <Users className="w-4 h-4 inline ml-1" />
          {participants.length} משתתפים
        </span>
        <span className={`font-medium ${rugsRemaining === 0 ? 'text-green-600' : rugsRemaining < 0 ? 'text-red-600' : 'text-[#581E83]'}`}>
          {totalRugs}/{rugCount} שטיחים מוקצים
        </span>
      </div>

      {errors._global && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
          {errors._global.join(', ')}
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {participants.map((p, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-[#e8e8e8] rounded-xl p-4 space-y-3 bg-white"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#581E83]">
                משתתף {index + 1}
              </span>
              {participants.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeParticipant(index)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#464646]/60 mb-1 block">שם</label>
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => updateField(index, 'name', e.target.value)}
                  placeholder="שם מלא"
                  className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#5E2F88] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-[#464646]/60 mb-1 block">טלפון</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={p.phone}
                  onChange={(e) => updateField(index, 'phone', e.target.value)}
                  placeholder="05X-XXXXXXX"
                  dir="ltr"
                  className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm text-left focus:border-[#5E2F88] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-[#464646]/60 mb-1 block">כמות שטיחים</label>
                <select
                  value={p.rugAllowance}
                  onChange={(e) => updateField(index, 'rugAllowance', e.target.value)}
                  className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#5E2F88] focus:outline-none bg-white"
                >
                  {Array.from({ length: rugCount }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id={`child-${index}`}
                  checked={p.hasChildren}
                  onChange={(e) => updateField(index, 'hasChildren', e.target.checked)}
                  className="w-4 h-4 accent-[#5E2F88]"
                />
                <label htmlFor={`child-${index}`} className="text-xs text-[#464646]/70 flex items-center gap-1">
                  <Baby className="w-3 h-3" />
                  עם ילדים
                </label>
              </div>
            </div>

            {errors[index] && (
              <div className="text-xs text-red-500 space-y-0.5">
                {errors[index].map((err, ei) => <p key={ei}>{err}</p>)}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {duplicateWarnings.length > 0 && !duplicatesApproved && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 text-orange-700 text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            <span>נמצאו מספרי טלפון כפולים</span>
          </div>
          <p className="text-xs text-orange-600">
            המספרים הבאים הוזנו יותר מפעם אחת. אם זה מכוון, לחץ אישור.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDuplicateWarnings([])}
              className="text-xs"
            >
              תיקון
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setDuplicatesApproved(true);
                setDuplicateWarnings([]);
              }}
              className="text-xs bg-orange-500 hover:bg-orange-600 text-white"
            >
              אישור - ההזנה תקינה
            </Button>
          </div>
        </div>
      )}

      {totalRugs < rugCount && (
        <Button
          type="button"
          variant="outline"
          onClick={addParticipant}
          className="w-full border-dashed border-[#5E2F88]/30 text-[#5E2F88]"
        >
          <Plus className="w-4 h-4 ml-1" />
          הוסף משתתף
        </Button>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isSaving || totalRugs !== rugCount}
        className="w-full bg-[#5E2F88] hover:bg-[#7B3DB0] text-white py-3"
      >
        {isSaving ? 'שומר...' : 'שמור ושלח קישורים'}
      </Button>
    </div>
  );
}
