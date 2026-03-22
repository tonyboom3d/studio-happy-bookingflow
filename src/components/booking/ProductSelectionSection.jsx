import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Wrench, HelpCircle, Sparkles, X, Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import ProductCatalogDrawer from './ProductCatalogDrawer';

const MAX_PRODUCTS = 21;

export default function ProductSelectionSection({
  cart,
  setCart,
  participants,
  woodType,
  onContinue,
  wixProducts, // הוספת מוצרים מ-Wix
  updateQuantity // עדכון כמות מוצר בעגלה
}) {
  const [showCatalog, setShowCatalog] = useState(false);
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
    if (optionId === 'catalog') {
      setShowCatalog(true);
    } else if (optionId === 'custom') {
      // פתיחת Lightbox byMySelf דרך Wix VELO
      window.parent.postMessage({ type: 'OPEN_LIGHTBOX', lightboxId: 'byMySelf' }, '*');
    } else if (optionId === 'help') {
      // פתיחת Lightbox needHelp דרך Wix VELO
      window.parent.postMessage({ type: 'OPEN_LIGHTBOX', lightboxId: 'needHelp' }, '*');
    }
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

  const totalMeetings = cart.reduce((sum, p) => sum + (p.meetings || getMeetings(p)) * (p.quantity || 1), 0);
  const totalPrice = cart.reduce((sum, p) => sum + p.price * (p.quantity || 1), 0);
  const totalItems = cart.reduce((sum, p) => sum + (p.quantity || 1), 0);

  const removeProduct = (productId) => {
    setCart(cart.filter(p => (p._id || p.id) !== productId));
  };

  return (
    <div className="py-4" dir="rtl">
      {/* הנחייה */}
      <div className="mb-3 text-right md:mb-4 md:text-center">
        <p className="text-sm text-[#464646]/70">בחרו את אחת מהאפשרויות</p>
      </div>

      {/* אפשרויות בחירה */}
      <div className="mb-4 grid grid-cols-1 gap-2 md:mb-6 md:grid-cols-3 md:gap-4">
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
                "relative rounded-xl border-2 text-right transition-all duration-300",
                "p-3 md:p-5",
                isSelected
                  ? "border-[#ADC178] bg-[#ADC178]/5 shadow-lg"
                  : "border-[#e8e8e8] hover:border-[#ADC178] bg-white hover:shadow-lg"
              )}
            >
              {option.recommended && (
                <div className="absolute -top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-[#ADC178] px-2 py-0.5 text-[10px] font-medium text-white md:px-3 md:text-xs">
                  <Sparkles className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  מומלץ
                </div>
              )}

              <div className="flex w-full flex-row items-center gap-3 text-right md:flex-col md:items-center md:text-center md:gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5] text-[#6B584C] md:h-12 md:w-12">
                  <Icon className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold leading-tight text-[#6B584C] md:text-base">{option.title}</h3>
                  <p className="mt-0.5 text-xs leading-snug text-[#464646]/70 md:mt-1 md:text-sm">{option.description}</p>
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
              const pid = product._id || product.id;
              const meetingsTotal = (product.meetings || getMeetings(product)) * (product.quantity || 1);
              return (
                <motion.div
                  key={pid}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bg-white px-2 py-2 sm:p-3 rounded-lg border border-[#e8e8e8] flex flex-nowrap items-center gap-2 min-w-0 hover:border-[#ADC178]/50 transition-colors"
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden bg-[#f5f5f5] shrink-0">
                    <img
                      src={product.image || "https://images.unsplash.com/photo-1588117472556-1ddf8c5c3c68?w=100"}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* שורה אחת: כותרת + מחיר/כלול + מפגשים */}
                  <div className="flex-1 min-w-0 flex items-center flex-nowrap gap-1.5 sm:gap-2">
                    <h5 className="flex-1 min-w-0 font-medium text-[#6B584C] text-xs sm:text-sm leading-tight truncate">
                      {product.title}
                    </h5>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {woodType === 'recycled' ? (
                        <span className="text-[10px] sm:text-xs text-[#6B584C] whitespace-nowrap leading-none">
                          כלול במחיר
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-[#ADC178] whitespace-nowrap tabular-nums leading-none">
                          ₪{product.price * (product.quantity || 1)}
                        </span>
                      )}
                      <span className="text-[10px] sm:text-xs text-[#464646]/70 whitespace-nowrap tabular-nums leading-none">
                        {meetingsTotal} מפגשים
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <div className="flex items-center gap-0.5 sm:gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(pid, -1)}
                        className="w-6 h-6 rounded-full border border-[#e8e8e8] bg-white flex items-center justify-center hover:border-[#ADC178] hover:bg-[#ADC178]/10 transition-colors"
                      >
                        <Minus className="w-3 h-3 text-[#6B584C]" />
                      </button>
                      <span className="text-xs sm:text-sm font-bold text-[#6B584C] min-w-[18px] sm:min-w-[20px] text-center tabular-nums">
                        {product.quantity || 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(pid, 1)}
                        className="w-6 h-6 rounded-full border border-[#e8e8e8] bg-white flex items-center justify-center hover:border-[#ADC178] hover:bg-[#ADC178]/10 transition-colors"
                      >
                        <Plus className="w-3 h-3 text-[#6B584C]" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProduct(pid)}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* כפתור המשך - הסרת אנימציה אינסופית לחיסכון בזיכרון */}
      <div className="flex justify-center mt-8">
        <Button
          onClick={onContinue}
          disabled={cart.length === 0}
          className="bg-[#ADC178] hover:bg-[#9ab569] hover:scale-[1.02] text-white px-8 py-3 rounded-lg
                     transition-all duration-200 text-lg disabled:opacity-50"
        >
          המשך לבחירת תאריכים
        </Button>
      </div>

      {/* קטלוג מוצרים */}
      <ProductCatalogDrawer
        isOpen={showCatalog}
        onClose={() => setShowCatalog(false)}
        cart={cart}
        setCart={setCart}
        getMeetings={getMeetings}
        woodType={woodType}
        participants={participants}
        wixProducts={wixProducts}
        updateQuantity={updateQuantity}
      />
    </div>
  );
}