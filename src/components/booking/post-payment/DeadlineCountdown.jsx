import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function DeadlineCountdown({ deadlineAt }) {
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
      setRemaining({ days, hours, minutes, expired: false });
    }

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [deadlineAt]);

  if (!remaining) return null;

  if (remaining.expired) {
    return (
      <div className="flex items-center gap-2 text-red-600 text-sm font-medium bg-red-50 rounded-lg px-3 py-2">
        <Clock className="w-4 h-4" />
        <span>המועד האחרון לבחירת סקיצות חלף</span>
      </div>
    );
  }

  const parts = [];
  if (remaining.days > 0) parts.push(`${remaining.days} ימים`);
  if (remaining.hours > 0) parts.push(`${remaining.hours} שעות`);
  if (remaining.days === 0) parts.push(`${remaining.minutes} דקות`);

  const isUrgent = remaining.days === 0 && remaining.hours < 12;

  return (
    <div className={`flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2 ${
      isUrgent ? 'text-orange-700 bg-orange-50' : 'text-[#581E83] bg-[#f5f0fa]'
    }`}>
      <Clock className="w-4 h-4" />
      <span>נותרו {parts.join(' ו-')} לבחירת סקיצות</span>
    </div>
  );
}
