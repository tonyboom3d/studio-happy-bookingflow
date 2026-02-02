import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Wrench, HelpCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import ProductCatalogDrawer from './ProductCatalogDrawer';
import CustomBuildModal from './CustomBuildModal';
import ConsultationModal from './ConsultationModal';

export default function ProductSelectionSection({ 
  cart, 
  setCart, 
  participants, 
  woodType, 
  onContinue 
}) {
  const [showCatalog, setShowCatalog] = useState(false);
  const [showCustomBuild, setShowCustomBuild] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);

  const getMeetings = (product) => {
    const isCouple = participants >= 2;
    const isRecycled = woodType === 'recycled';
    
    if (isCouple && isRecycled) return product.meetings_couple_recycled || 2;
    if (isCouple && !isRecycled) return product.meetings_couple_new || 3;
    if (!isCouple && isRecycled) return product.meetings_single_recycled || 3;
    return product.meetings_single_new || 4;
  };

  const options = [
    {
      id: 'catalog',
      title: 'בחירה מהקטלוג',
      description: 'בחרו מתוך מגוון מוצרים מוכנים',
      icon: ShoppingBag,
      recommended: true,
      onClick: () => setShowCatalog(true)
    },
    {
      id: 'custom',
      title: 'לבנות משהו משלי',
      description: 'יש לכם רעיון משלכם? ספרו לנו!',
      icon: Wrench,
      onClick: () => setShowCustomBuild(true)
    },
    {
      id: 'help',
      title: 'לא יודע/ת מה לבנות',
      description: 'נשמח לעזור לכם לבחור',
      icon: HelpCircle,
      onClick: () => setShowConsultation(true)
    }
  ];

  const totalMeetings = cart.reduce((sum, p) => sum + (p.meetings || getMeetings(p)), 0);
  const totalPrice = cart.reduce((sum, p) => sum + p.price, 0);

  return (
    <div className="py-4">
      {/* אפשרויות בחירה */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <motion.button
              key={option.id}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={option.onClick}
              className={cn(
                "relative p-5 rounded-xl border-2 text-right transition-all duration-300",
                "border-[#e8e8e8] hover:border-[#ADC178] bg-white hover:shadow-lg"
              )}
            >
              {option.recommended && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#ADC178] text-white text-xs font-medium rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  מומלץ
                </div>
              )}
              
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#6B584C]">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#6B584C]">{option.title}</h3>
                  <p className="text-sm text-[#464646]/70 mt-1">{option.description}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* סיכום מוצרים נבחרים */}
      {cart.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-[#ADC178]/10 rounded-xl border border-[#ADC178]/30"
        >
          <h4 className="font-medium text-[#6B584C] mb-3">המוצרים שנבחרו:</h4>
          <div className="space-y-2 mb-4">
            {cart.map(product => (
              <div key={product.id} className="flex items-center justify-between text-sm">
                <span className="text-[#464646]">{product.title}</span>
                <span className="text-[#6B584C] font-medium">₪{product.price}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-[#ADC178]/30 flex justify-between items-center">
            <div className="text-sm text-[#464646]">
              {cart.length} מוצרים • {totalMeetings} מפגשים
            </div>
            <div className="text-lg font-bold text-[#ADC178]">₪{totalPrice}</div>
          </div>
        </motion.div>
      )}

      {/* כפתור המשך */}
      <div className="flex justify-center mt-8">
        <Button
          onClick={onContinue}
          disabled={cart.length === 0}
          className="bg-[#ADC178] hover:bg-[#9ab569] text-white px-8 py-3 rounded-lg
                     transition-all duration-200 text-lg disabled:opacity-50"
        >
          המשך לבחירת תאריכים
        </Button>
      </div>

      {/* מודלים */}
      <ProductCatalogDrawer 
        isOpen={showCatalog} 
        onClose={() => setShowCatalog(false)}
        cart={cart}
        setCart={setCart}
        getMeetings={getMeetings}
      />
      <CustomBuildModal 
        isOpen={showCustomBuild} 
        onClose={() => setShowCustomBuild(false)} 
      />
      <ConsultationModal 
        isOpen={showConsultation} 
        onClose={() => setShowConsultation(false)} 
      />
    </div>
  );
}