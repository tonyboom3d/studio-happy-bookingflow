import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Ruler, User, Baby, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const CARPET_SIZES = [
  {
    id: '60x60',
    label: '60×60 ס"מ',
    price: 0,
    priceLabel: 'כלול במחיר',
    note: 'למתחילים',
    recommended: true
  },
  {
    id: '90x90',
    label: '90×90 ס"מ',
    price: 100,
    priceLabel: '+₪100',
    note: 'למנוסים יותר',
    recommended: false
  }
];

export default function CarpetSizeSection({
  adults,
  children,
  carpetSizes,
  setCarpetSizes,
  onContinue
}) {
  // אתחול ברירות מחדל - כל מבוגר מתחיל עם 60x60
  useEffect(() => {
    const defaultSizes = {};
    for (let i = 0; i < adults; i++) {
      if (!carpetSizes[i]) {
        defaultSizes[i] = '60x60';
      }
    }
    if (Object.keys(defaultSizes).length > 0) {
      setCarpetSizes(prev => ({ ...prev, ...defaultSizes }));
    }
  }, [adults, carpetSizes, setCarpetSizes]);

  const handleSizeChange = (adultIndex, sizeId) => {
    setCarpetSizes(prev => ({
      ...prev,
      [adultIndex]: sizeId
    }));
  };

  // חישוב תוספת מחיר
  const totalUpgradePrice = Object.values(carpetSizes)
    .filter(size => size === '90x90')
    .length * 100;

  // האם כל המבוגרים בחרו גודל
  const allSelected = Array.from({ length: adults }, (_, i) => carpetSizes[i])
    .every(size => size);

  // חישוב כמה ילדים מצטרפים לכל מבוגר
  const childrenPerAdult = Math.floor(children / adults);
  const extraChildren = children % adults;

  return (
    <div className="py-6" dir="rtl">
      {/* כותרת */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Ruler className="w-5 h-5 text-[#581E83]" />
          <h3 className="text-lg font-medium text-[#581E83]">ביחרו את גודל השטיח שלכם</h3>
        </div>
        <p className="text-sm text-[#464646]/70">
          כל משתתף בוחר את גודל השטיח שירצה ליצור
        </p>
      </div>

      {/* הסבר על הגדלים */}
      <div className="mb-6 rounded-lg border border-[#5E2F88]/20 bg-[#5E2F88]/5 p-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-[#5E2F88] mt-0.5 shrink-0" />
          <div className="text-xs text-[#464646]/80 space-y-1">
            <p><strong>60×60 ס"מ</strong> — גודל מושלם למתחילים, מספיק לכרית נוי או תמונה קטנה</p>
            <p><strong>90×90 ס"מ</strong> — לציין שזה נועד למי שכבר יצא לו לעשות שטיח בעבר</p>
          </div>
        </div>
      </div>

      {/* בחירה לכל מבוגר */}
      <div className="space-y-4">
        {Array.from({ length: adults }, (_, adultIndex) => {
          const hasChild = adultIndex < (childrenPerAdult > 0 ? adults : extraChildren) || 
                          (childrenPerAdult > 0);
          const childCount = childrenPerAdult + (adultIndex < extraChildren ? 1 : 0);
          const actualHasChild = childCount > 0 && adultIndex < adults;
          const showChild = children > 0 && adultIndex < Math.min(adults, children);

          return (
            <motion.div
              key={adultIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: adultIndex * 0.1 }}
              className="rounded-xl border border-[#e8e8e8] bg-white p-4"
            >
              {/* כותרת משתתף */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#581E83]" />
                  <span className="font-medium text-[#581E83]">
                    {adults === 1 ? 'המשתתף' : `משתתף ${adultIndex + 1}`}
                  </span>
                </div>
                {showChild && (
                  <div className="flex items-center gap-1 bg-[#5E2F88]/10 rounded-full px-2 py-0.5">
                    <Baby className="w-3 h-3 text-[#5E2F88]" />
                    <span className="text-xs text-[#5E2F88]">+ ילד (ביחד)</span>
                  </div>
                )}
              </div>

              {/* אפשרויות גודל */}
              <div className="grid grid-cols-2 gap-2">
                {CARPET_SIZES.map((size) => {
                  const isSelected = carpetSizes[adultIndex] === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => handleSizeChange(adultIndex, size.id)}
                      className={cn(
                        'relative rounded-lg border-2 p-3 text-right transition-all',
                        isSelected
                          ? 'border-[#5E2F88] bg-[#5E2F88]/10'
                          : 'border-[#e8e8e8] hover:border-[#5E2F88]/50'
                      )}
                    >
                      {size.recommended && (
                        <span className="absolute -top-2 right-2 text-[10px] bg-[#5E2F88] text-white px-2 py-0.5 rounded-full">
                          מומלץ
                        </span>
                      )}
                      <div className="font-medium text-[#581E83]">{size.label}</div>
                      <div className={cn(
                        'text-sm mt-1',
                        size.price === 0 ? 'text-green-600' : 'text-[#5E2F88]'
                      )}>
                        {size.priceLabel}
                      </div>
                      <div className="text-xs text-[#464646]/60 mt-1">{size.note}</div>
                      {isSelected && (
                        <motion.div
                          layoutId={`check-${adultIndex}`}
                          className="absolute top-2 left-2 w-5 h-5 bg-[#5E2F88] rounded-full flex items-center justify-center"
                        >
                          <span className="text-white text-xs">✓</span>
                        </motion.div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* סיכום תוספת */}
      {totalUpgradePrice > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center"
        >
          <p className="text-sm text-[#464646]/70">
            תוספת עבור שטיחים גדולים:
          </p>
          <p className="text-lg font-semibold text-[#5E2F88]">
            +₪{totalUpgradePrice}
          </p>
        </motion.div>
      )}

      {/* כפתור המשך */}
      <div className="flex justify-center mt-6">
        <Button
          onClick={onContinue}
          disabled={!allSelected}
          className="bg-[#5E2F88] hover:bg-[#7B3DB0] text-white px-8 py-3 rounded-lg text-lg disabled:opacity-50"
        >
          המשך לבחירת עיצוב
        </Button>
      </div>
    </div>
  );
}
