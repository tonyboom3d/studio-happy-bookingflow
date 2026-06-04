import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PersonalDetailsSection({
  onPay,
  isSubmitting
}) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (!isSubmitting && !hasFired.current) {
      hasFired.current = true;
      onPay();
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-10 px-2" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-[#e8e8e8] border-t-[#5E2F88] animate-spin" />
          <Loader2 className="w-6 h-6 text-[#5E2F88] absolute animate-pulse" />
        </div>
        <p className="text-base font-semibold text-[#581E83]">
          מעביר לדף התשלום...
        </p>
        <p className="text-sm text-[#464646]/60 text-center max-w-xs">
          תוכלו למלא את הפרטים שלכם בדף התשלום המאובטח
        </p>
      </motion.div>
    </div>
  );
}
