import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, Recycle, TreeDeciduous } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function WoodTypeSection({ woodType, setWoodType, onContinue }) {
  const options = [
    {
      id: 'recycled',
      title: 'עץ ממוחזר',
      subtitle: 'כלול במחיר',
      icon: Recycle,
      description: 'עץ שעבר חיים קודמים - ייחודי ומיוחד'
    },
    {
      id: 'new',
      title: 'עץ חדש',
      subtitle: 'בתוספת תשלום',
      icon: TreeDeciduous,
      description: 'עץ חדש באיכות גבוהה'
    }
  ];

  return (
    <div className="py-4">
      {/* הנחייה */}
      <div className="text-right mb-2">
        <p className="text-sm text-[#464646]/70">בחרו סוג עץ</p>
      </div>

      {/* הסבר על ההבדלים */}
      <div className="mb-6 p-4 bg-[#f5f5f5] rounded-xl">
        <h3 className="text-base font-semibold text-[#6B584C] mb-3">מה ההבדל בין סוגי העצים?</h3>
        <div className="space-y-2 text-sm text-[#464646]">
          <div>
            <span className="font-medium text-[#6B584C]">עץ ממוחזר:</span>
            <p className="text-xs mt-0.5">טקסטקרשים מפורקים ממשטחי העמסה (פלטות). עלותו העץ נמוכה אך הוא מחייב זמן עבודה נוסף של הכנה ושיוף.
            </p>
          </div>
          <div>
            <span className="font-medium text-[#6B584C]">עץ חדש:</span>
            <p className="text-xs mt-0.5">עץ מוכן לעבודה, המאפשר הספקים מהירים. עלות העץ היא בתוספת לתשלום על הסדנה.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((option) => {
          const isSelected = woodType === option.id;
          const Icon = option.icon;

          return (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setWoodType(option.id)}
              className={cn(
                "relative p-6 rounded-xl border-2 text-right transition-all duration-300",
                isSelected
                  ? "border-[#ADC178] bg-[#ADC178]/5"
                  : "border-[#e8e8e8] hover:border-[#ADC178]/50 bg-white"
              )}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 left-3 w-6 h-6 rounded-full bg-[#ADC178] flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}

              <div className="flex flex-col items-center text-center gap-3">
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                  isSelected ? "bg-[#ADC178] text-white" : "bg-[#f5f5f5] text-[#6B584C]"
                )}>
                  <Icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#6B584C]">{option.title}</h3>
                  <p className={cn(
                    "text-sm font-medium mt-1",
                    option.id === 'recycled' ? "text-[#ADC178]" : "text-[#464646]"
                  )}>
                    {option.subtitle}
                  </p>
                  <p className="text-sm text-[#464646]/70 mt-2">{option.description}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="flex justify-center mt-8">
        <motion.div
          animate={woodType ? {
            scale: [1, 1.05, 1],
          } : {}}
          transition={{
            duration: 2,
            repeat: woodType ? Infinity : 0,
            repeatDelay: 1
          }}
        >
          <Button
            onClick={onContinue}
            disabled={!woodType}
            className="bg-[#ADC178] hover:bg-[#9ab569] text-white px-8 py-3 rounded-lg
                       transition-all duration-200 text-lg disabled:opacity-50"
          >
            המשך לבחירת מוצרים
          </Button>
        </motion.div>
      </div>
    </div>
  );
}