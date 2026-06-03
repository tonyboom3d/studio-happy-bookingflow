import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check } from 'lucide-react';

export default function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  sketchTitle,
  canvasSize,
  daysUntilWorkshop,
}) {
  const [countdown, setCountdown] = useState(3);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) {
      setCountdown(3);
      setConfirmed(false);
      return;
    }
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [open, countdown]);

  const isFinal = daysUntilWorkshop < 7;

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto" dir="rtl">
        <div className="flex flex-col items-center text-center p-2">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
            isFinal ? 'bg-orange-100' : 'bg-[#f5f0fa]'
          }`}>
            {isFinal ? (
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            ) : (
              <Check className="w-6 h-6 text-[#5E2F88]" />
            )}
          </div>

          <h3 className="text-lg font-bold text-[#581E83] mb-2">
            {confirmed ? 'הבחירה נשמרה!' : 'אישור בחירת סקיצה'}
          </h3>

          {!confirmed && (
            <>
              <div className="bg-[#fafafa] rounded-xl p-3 w-full mb-3">
                <p className="text-sm font-medium text-[#581E83]">{sketchTitle}</p>
                <p className="text-xs text-[#464646]/60 mt-1">גודל קנבס: {canvasSize}</p>
              </div>

              {isFinal ? (
                <p className="text-sm text-orange-700 mb-4">
                  הסדנה בעוד פחות משבוע. לאחר האישור הבחירה תהיה <strong>סופית ולא ניתנת לשינוי</strong>.
                </p>
              ) : (
                <p className="text-sm text-[#464646]/70 mb-4">
                  ניתן לשנות את הבחירה בעוד יותר משבוע מהסדנה, כל עוד הסקיצה לא נכנסה להכנה.
                </p>
              )}

              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-[#e8e8e8]"
                >
                  ביטול
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={countdown > 0}
                  className="flex-1 bg-[#5E2F88] hover:bg-[#7B3DB0] text-white"
                >
                  {countdown > 0 ? `אישור (${countdown})` : 'אישור סופי'}
                </Button>
              </div>
            </>
          )}

          {confirmed && (
            <p className="text-sm text-[#464646]/70">
              הסקיצה נבחרה בהצלחה. ניתן לסגור חלון זה.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
