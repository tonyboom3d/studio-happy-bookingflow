import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Wrench, HelpCircle, Sparkles, X, Baby, Smile, Meh, Frown, Skull } from 'lucide-react';
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
  onContinue,
  wixProducts // הוספת מוצרים מ-Wix
}) {
  const [showCatalog, setShowCatalog] = useState(false);
  const [showCustomBuild, setShowCustomBuild] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  const getMeetings = (product) => {
    const isCouple = participants >= 2;
    const isRecycled = woodType === 'recycled';

    // שימוש בשדות החדשים מ-Wix CMS
    if (isCouple && isRecycled) return parseInt(product.meetings_couple_recycled) || 2;
    if (isCouple && !isRecycled) return parseInt(product.meetings_couple_new) || 3;
    if (!isCouple && isRecycled) return parseInt(product.meetings_single_recycled) || 3;
    return parseInt(product.meetings_single_new) || 4;
  };

  const handleOptionClick = (optionId) => {
    setSelectedOption(optionId);
    if (optionId === 'catalog') setShowCatalog(true);
    if (optionId === 'custom') setShowCustomBuild(true);
    if (optionId === 'help') setShowConsultation(true);
  };

  const options = [
    {
      id: 'catalog',
      title: 'בחירה מהקטלוג',
      description: 'בחרו מתוך מגוון מוצרים מוכנים',
      icon: ShoppingBag,
      recommended: true
    },
    {
      id: 'custom',
      title: 'לבנות משהו משלי',
      description: 'יש לכם רעיון משלכם? ספרו לנו!',
      icon: Wrench
    },
    {
      id: 'help',
      title: 'אשמח להתייעץ לפני',
      description: 'נשמח לעזור לכם לבחור',
      icon: HelpCircle
    }
  ];

  const totalMeetings = cart.reduce((sum, p) => sum + (p.meetings || getMeetings(p)), 0);
  const totalPrice = cart.reduce((sum, p) => sum + p.price, 0);

  const removeProduct = (productId) => {
    setCart(cart.filter(p => p.id !== productId));
  };

  return (
    <div className="py-4">
      {/* הנחייה */}
      <div className="text-center mb-4">
        <p className="text-sm text-[#464646]/70">בחרו את אחת מהאפשרויות</p>
      </div>

      {/* אפשרויות בחירה */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedOption === option.id;
          return (
            <motion.button
              key={option.id}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleOptionClick(option.id)}
              className={cn(
                "relative p-5 rounded-xl border-2 text-right transition-all duration-300",
                isSelected
                  ? "border-[#ADC178] bg-[#ADC178]/5 shadow-lg"
                  : "border-[#e8e8e8] hover:border-[#ADC178] bg-white hover:shadow-lg"
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

      {/* מוצרים נבחרים */}
      {cart.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h4 className="font-medium text-[#6B584C] mb-3">המוצרים שנבחרו:</h4>
          <div className="space-y-2">
            {cart.map(product => {
              const DifficultyIcon = product.difficulty <= 1.5 ? Baby :
                product.difficulty <= 2.5 ? Smile :
                  product.difficulty <= 3.5 ? Meh :
                    product.difficulty <= 4.5 ? Frown : Skull;
              const difficultyColor = product.difficulty <= 1.5 ? 'text-green-500' :
                product.difficulty <= 2.5 ? 'text-lime-500' :
                  product.difficulty <= 3.5 ? 'text-yellow-500' :
                    product.difficulty <= 4.5 ? 'text-orange-500' : 'text-red-500';

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bg-white p-3 rounded-lg border border-[#e8e8e8] flex items-center justify-between hover:border-[#ADC178]/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#f5f5f5]">
                      <img
                        src={product.image || "https://images.unsplash.com/photo-1588117472556-1ddf8c5c3c68?w=100"}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h5 className="font-medium text-[#6B584C] text-sm">{product.title}</h5>
                      <div className="flex items-center gap-2 mt-0.5">
                        <DifficultyIcon className={`w-3.5 h-3.5 ${difficultyColor}`} />
                        <span className="text-xs text-[#464646]/70">•</span>
                        <span className="text-xs text-[#464646]/70">{product.meetings} מפגשים</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#ADC178]">₪{product.price}</span>
                    <button
                      onClick={() => removeProduct(product.id)}
                      className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* כפתור המשך */}
      <div className="flex justify-center mt-8">
        <motion.div
          animate={cart.length > 0 ? {
            scale: [1, 1.05, 1],
          } : {}}
          transition={{
            duration: 2,
            repeat: cart.length > 0 ? Infinity : 0,
            repeatDelay: 1
          }}
        >
          <Button
            onClick={onContinue}
            disabled={cart.length === 0}
            className="bg-[#ADC178] hover:bg-[#9ab569] text-white px-8 py-3 rounded-lg
                       transition-all duration-200 text-lg disabled:opacity-50"
          >
            המשך לבחירת תאריכים
          </Button>
        </motion.div>
      </div>

      {/* מודלים */}
      <ProductCatalogDrawer
        isOpen={showCatalog}
        onClose={() => setShowCatalog(false)}
        cart={cart}
        setCart={setCart}
        getMeetings={getMeetings}
        woodType={woodType}
        participants={participants}
        wixProducts={wixProducts}
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