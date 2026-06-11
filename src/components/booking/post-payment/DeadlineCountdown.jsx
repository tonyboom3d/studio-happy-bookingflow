import React, { useState, useEffect } from 'react';

function pad(n) {
  return String(n).padStart(2, '0');
}

function TimeBox({ value, label }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-white border border-[#5E2F88]/20 flex items-center justify-center shadow-sm">
        <span className="text-lg sm:text-xl font-bold text-[#581E83] tabular-nums">
          {pad(value)}
        </span>
      </div>
      <span className="text-[11px] sm:text-xs text-[#464646]/60 font-medium">{label}</span>
    </div>
  );
}

export default function DeadlineCountdown({ deadlineAt, rugCount = 1, participantCount = 1 }) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!deadlineAt) return;
    const deadline = new Date(deadlineAt);

    function update() {
      const diff = deadline - Date.now();
      if (diff <= 0) {
        setRemaining({ expired: true });
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setRemaining({ days, hours, minutes, seconds, expired: false });
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadlineAt]);

  if (!remaining) return null;

  const isPluralPeople = participantCount > 1;
  const isPluralSketches = rugCount > 1;
  const pronoun = isPluralPeople ? 'לכם' : 'לך';
  const sketchLabel = isPluralSketches ? 'לבחירת סקיצות' : 'לבחירת סקיצה';

  if (remaining.expired) {
    return (
      <div className="text-center py-3">
        <p className="text-red-600 text-sm font-medium bg-red-50 rounded-xl px-3 py-2.5">
          המועד האחרון {sketchLabel} חלף
        </p>
      </div>
    );
  }

  const isUrgent = remaining.days === 0 && remaining.hours < 12;

  return (
    <div
      className={`rounded-2xl px-3 py-3.5 text-center ${
        isUrgent ? 'bg-orange-50 border border-orange-200' : 'bg-[#f5f0fa] border border-[#5E2F88]/10'
      }`}
      dir="rtl"
    >
      <p className={`text-sm font-medium mb-2 ${isUrgent ? 'text-orange-800' : 'text-[#581E83]'}`}>
        נשארו {pronoun} עוד
      </p>

      <div className="flex items-center justify-center gap-1.5 sm:gap-2" dir="ltr">
        {remaining.days > 0 && <TimeBox value={remaining.days} label="ימים" />}
        <TimeBox value={remaining.hours} label="שעות" />
        <TimeBox value={remaining.minutes} label="דקות" />
        <TimeBox value={remaining.seconds} label="שניות" />
      </div>

      <p className={`text-sm font-medium mt-2 ${isUrgent ? 'text-orange-700' : 'text-[#581E83]/80'}`}>
        {sketchLabel}
      </p>
    </div>
  );
}
