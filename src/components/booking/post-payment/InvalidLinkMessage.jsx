import React from 'react';
import { motion } from 'framer-motion';
import { LinkIcon, Mail, MessageCircle } from 'lucide-react';

export default function InvalidLinkMessage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[60vh] flex flex-col items-center justify-center p-6"
      dir="rtl"
    >
      <div className="w-16 h-16 rounded-full bg-[#fef3cd] flex items-center justify-center mb-4">
        <LinkIcon className="w-8 h-8 text-[#856404]" />
      </div>

      <h2 className="text-xl font-bold text-[#581E83] mb-2">
        הקישור אינו תקף
      </h2>
      <p className="text-sm text-[#464646]/70 text-center max-w-sm mb-6 leading-relaxed">
        נראה שהגעת לקישור הזה בטעות, או שפג תוקפו.
        <br />
        אם הזמנת סדנה, נשלח לך קישור עם סיכום ההזמנה ובחירת הסקיצות דרך:
      </p>

      <div className="flex gap-4 text-sm text-[#464646]/70">
        <div className="flex items-center gap-1.5">
          <Mail className="w-4 h-4 text-[#5E2F88]" />
          <span>אימייל</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4 text-[#25D366]" />
          <span>וואטסאפ</span>
        </div>
      </div>

      <p className="text-xs text-[#464646]/50 mt-6 text-center max-w-xs">
        אם יש לך שאלות, ניתן ליצור קשר עם סטודיו האפי
      </p>
    </motion.div>
  );
}
