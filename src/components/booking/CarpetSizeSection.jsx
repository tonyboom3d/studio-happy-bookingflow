import React, { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function CarpetSizeSection({
  adults,
  children,
  carpetSizes,
  setCarpetSizes,
  onContinue
}) {
  const totalCarpets = adults;

  // חישוב כמות שטיחים לפי גודל
  const count60 = useMemo(() => {
    return Object.values(carpetSizes).filter(s => s === '60x60').length;
  }, [carpetSizes]);

  const count90 = useMemo(() => {
    return Object.values(carpetSizes).filter(s => s === '90x90').length;
  }, [carpetSizes]);

  const totalSelected = count60 + count90;

  // אתחול ברירות מחדל - כל השטיחים מתחילים ב-60x60
  useEffect(() => {
    const currentCount = Object.keys(carpetSizes).length;
    if (currentCount < totalCarpets) {
      const newSizes = { ...carpetSizes };
      for (let i = currentCount; i < totalCarpets; i++) {
        newSizes[i] = '60x60';
      }
      setCarpetSizes(newSizes);
    } else if (currentCount > totalCarpets) {
      const newSizes = {};
      for (let i = 0; i < totalCarpets; i++) {
        newSizes[i] = carpetSizes[i] || '60x60';
      }
      setCarpetSizes(newSizes);
    }
  }, [totalCarpets, carpetSizes, setCarpetSizes]);

  // שינוי כמות שטיחים מגודל מסוים
  const handleQuantityChange = (sizeId, delta) => {
    const currentCount = sizeId === '60x60' ? count60 : count90;
    const otherCount = sizeId === '60x60' ? count90 : count60;
    const newCount = currentCount + delta;

    if (newCount < 0) return;
    if (newCount + otherCount > totalCarpets) return;

    // בניית מחדש של carpetSizes
    const newSizes = {};
    let idx = 0;

    // קודם שטיחים 60x60
    const new60 = sizeId === '60x60' ? newCount : count60;
    for (let i = 0; i < new60; i++) {
      newSizes[idx++] = '60x60';
    }

    // אחר כך שטיחים 90x90
    const new90 = sizeId === '90x90' ? newCount : count90;
    for (let i = 0; i < new90; i++) {
      newSizes[idx++] = '90x90';
    }

    setCarpetSizes(newSizes);
  };

  // תוספת מחיר
  const totalUpgradePrice = count90 * 100;

  // האם נבחרו כל השטיחים
  const allSelected = totalSelected === totalCarpets;

  return (
    <div className="py-4" dir="rtl">
      {/* כותרת */}
      <div className="text-center mb-4">
        <h3 className="text-[20px] font-medium text-[#581E83]">בחרו את גודל השטיח</h3>
        <p className="text-[16px] text-[#464646]/70 mt-1">
          {totalCarpets === 1 ? 'שטיח אחד להכנה' : `${totalCarpets} שטיחים להכנה`}
        </p>
      </div>

      {/* תמונת השוואה והסבר גדלים */}
      <div className="mb-5 rounded-xl border border-[#e8e8e8] bg-white p-4">
        {/* תמונת השוואה */}
        <div className="flex justify-center mb-4">
          <div className="relative flex items-end justify-center gap-6">
            {/* 60x60 */}
            <div className="flex flex-col items-center">
              <div 
                className="bg-[#5E2F88]/10 border-2 border-[#5E2F88]/30 rounded-lg flex items-center justify-center"
                style={{ width: '60px', height: '60px' }}
              >
                <span className="text-[12px] font-medium text-[#5E2F88]">60×60</span>
              </div>
              <span className="text-[14px] text-[#464646]/70 mt-2">ס״מ</span>
            </div>

            {/* 90x90 */}
            <div className="flex flex-col items-center">
              <div 
                className="bg-[#5E2F88]/10 border-2 border-[#5E2F88]/30 rounded-lg flex items-center justify-center"
                style={{ width: '90px', height: '90px' }}
              >
                <span className="text-[14px] font-medium text-[#5E2F88]">90×90</span>
              </div>
              <span className="text-[14px] text-[#464646]/70 mt-2">ס״מ</span>
            </div>
          </div>
        </div>

        {/* הסברים */}
        <div className="space-y-2 text-center">
          <p className="text-[16px] text-[#581E83]">
            <strong>60×60</strong> — גודל מושלם למתחילים
          </p>
          <p className="text-[16px] text-[#581E83]">
            <strong>90×90</strong> — למתקדמים שכבר התנסו
          </p>
        </div>
      </div>

      {/* בחירת כמויות */}
      <div className="space-y-3">
        {/* 60x60 */}
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[18px] font-medium text-[#581E83]">60×60 ס״מ</div>
              <div className="text-[14px] text-green-600">כלול במחיר</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleQuantityChange('60x60', -1)}
                disabled={count60 <= 0}
                className="w-9 h-9 rounded-full border-2 border-[#5E2F88] flex items-center justify-center
                           text-[#5E2F88] hover:bg-[#5E2F88] hover:text-white transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#5E2F88]"
              >
                <Minus className="w-4 h-4" />
              </button>
              <motion.span
                key={count60}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-[24px] font-bold text-[#581E83] w-8 text-center"
              >
                {count60}
              </motion.span>
              <button
                type="button"
                onClick={() => handleQuantityChange('60x60', 1)}
                disabled={totalSelected >= totalCarpets}
                className="w-9 h-9 rounded-full border-2 border-[#5E2F88] flex items-center justify-center
                           text-[#5E2F88] hover:bg-[#5E2F88] hover:text-white transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#5E2F88]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 90x90 */}
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[18px] font-medium text-[#581E83]">90×90 ס״מ</div>
              <div className="text-[14px] text-[#5E2F88]">+₪100 לשטיח</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleQuantityChange('90x90', -1)}
                disabled={count90 <= 0}
                className="w-9 h-9 rounded-full border-2 border-[#5E2F88] flex items-center justify-center
                           text-[#5E2F88] hover:bg-[#5E2F88] hover:text-white transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#5E2F88]"
              >
                <Minus className="w-4 h-4" />
              </button>
              <motion.span
                key={count90}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-[24px] font-bold text-[#581E83] w-8 text-center"
              >
                {count90}
              </motion.span>
              <button
                type="button"
                onClick={() => handleQuantityChange('90x90', 1)}
                disabled={totalSelected >= totalCarpets}
                className="w-9 h-9 rounded-full border-2 border-[#5E2F88] flex items-center justify-center
                           text-[#5E2F88] hover:bg-[#5E2F88] hover:text-white transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#5E2F88]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* סטטוס בחירה */}
      <div className="mt-4 text-center">
        <p className={cn(
          "text-[16px]",
          allSelected ? "text-green-600" : "text-[#464646]/70"
        )}>
          {allSelected 
            ? `נבחרו ${totalCarpets} שטיחים ✓`
            : `נבחרו ${totalSelected} מתוך ${totalCarpets} שטיחים`
          }
        </p>
      </div>

      {/* סיכום תוספת */}
      {totalUpgradePrice > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-center"
        >
          <p className="text-[14px] text-[#464646]/70">
            תוספת עבור שטיחים גדולים:
          </p>
          <p className="text-[20px] font-semibold text-[#5E2F88]">
            +₪{totalUpgradePrice}
          </p>
        </motion.div>
      )}

      {/* כפתור המשך */}
      <div className="flex justify-center mt-5">
        <Button
          onClick={onContinue}
          disabled={!allSelected}
          className="bg-[#5E2F88] hover:bg-[#7B3DB0] text-white px-8 py-3 rounded-lg text-[18px] disabled:opacity-50"
        >
          המשך לבחירת עיצוב
        </Button>
      </div>
    </div>
  );
}
