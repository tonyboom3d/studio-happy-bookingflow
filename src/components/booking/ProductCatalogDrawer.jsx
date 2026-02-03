import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  X, Filter, Check, Info, Package, Calendar, CreditCard,
  Baby, Smile, Meh, Frown, Skull, TreeDeciduous
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Fallback products אם Wix עדיין לא שלח נתונים
const FALLBACK_PRODUCTS = [
  { id: 'fallback-1', title: 'טוען מוצרים...', price: 0, difficulty: 1, image: null, meetings_single_recycled: 1, meetings_couple_recycled: 1, meetings_single_new: 1, meetings_couple_new: 1 }
];

function DifficultyIcon({ difficulty }) {
  if (difficulty <= 1.5) return <Baby className="w-5 h-5 text-green-500" />;
  if (difficulty <= 2.5) return <Smile className="w-5 h-5 text-lime-500" />;
  if (difficulty <= 3.5) return <Meh className="w-5 h-5 text-yellow-500" />;
  if (difficulty <= 4.5) return <Frown className="w-5 h-5 text-orange-500" />;
  return <Skull className="w-5 h-5 text-red-500" />;
}

function getDifficultyLabel(difficulty) {
  if (difficulty <= 1.5) return 'קל מאוד';
  if (difficulty <= 2.5) return 'קל';
  if (difficulty <= 3.5) return 'בינוני';
  if (difficulty <= 4.5) return 'מאתגר';
  return 'מאתגר מאוד';
}

function ProductGridCard({ product, isSelected, onClick, meetings, showNewWoodPrices }) {
  const [showDimensions, setShowDimensions] = useState(false);
  const displayPrice = showNewWoodPrices ? Math.round(product.price * 1.2) : product.price;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative bg-white rounded-xl overflow-hidden border-2 transition-all duration-300",
        isSelected
          ? "border-[#ADC178] shadow-lg"
          : "border-[#e8e8e8] hover:border-[#ADC178]/50 hover:shadow-md"
      )}
    >
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 left-3 z-10 w-6 h-6 rounded-full bg-[#ADC178] flex items-center justify-center shadow-md"
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      )}

      {/* כפתור מידע */}
      <TooltipProvider>
        <Tooltip open={showDimensions} onOpenChange={setShowDimensions}>
          <TooltipTrigger asChild>
            <button
              className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:bg-white transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowDimensions(!showDimensions);
              }}
            >
              <Info className="w-4 h-4 text-[#6B584C]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-white border border-[#e8e8e8] p-3">
            <div className="text-sm text-[#464646]">
              <p className="font-medium mb-1">מידות:</p>
              <p>אורך: {product.dimensions?.length || product.length || '-'} ס״מ</p>
              <p>רוחב: {product.dimensions?.width || product.width || '-'} ס״מ</p>
              <p>עומק/גובה: {product.dimensions?.depth || product.depth || '-'} ס״מ</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <button onClick={onClick} className="w-full text-right">
        <div className="aspect-[4/3] overflow-hidden bg-[#f5f5f5]">
          <img
            src={product.image || "https://images.unsplash.com/photo-1588117472556-1ddf8c5c3c68?w=400"}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-[#6B584C] text-base mb-2">{product.title}</h3>

          <div className="flex items-center justify-between mb-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <DifficultyIcon difficulty={product.difficulty || 3} />
                    <span className="text-xs text-[#464646]/70">{getDifficultyLabel(product.difficulty)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>רמת קושי: {product.difficulty}/5</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex items-center gap-1 text-xs text-[#464646]/70">
              <Calendar className="w-3.5 h-3.5" />
              <span>{meetings} מפגשים</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#e8e8e8]">
            <span className="text-lg font-bold text-[#ADC178]">₪{displayPrice}</span>
          </div>
        </div>
      </button>
    </motion.div>
  );
}

export default function ProductCatalogDrawer({
  isOpen,
  onClose,
  cart,
  setCart,
  getMeetings,
  woodType,
  wixProducts // קבלת מוצרים מ-Wix!
}) {
  const [difficultyFilter, setDifficultyFilter] = useState([1, 5]);
  const [priceFilter, setPriceFilter] = useState([0, 1000]);
  const [showFilters, setShowFilters] = useState(false);
  const [showNewWoodPrices, setShowNewWoodPrices] = useState(woodType === 'new');

  // שימוש במוצרים מ-Wix, אם אין - fallback
  const products = wixProducts && wixProducts.length > 0 ? wixProducts : FALLBACK_PRODUCTS;

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      return (
        (product.difficulty || 3) >= difficultyFilter[0] &&
        (product.difficulty || 3) <= difficultyFilter[1] &&
        (product.price || 0) >= priceFilter[0] &&
        (product.price || 0) <= priceFilter[1]
      );
    });
  }, [products, difficultyFilter, priceFilter]);

  const toggleProduct = (product) => {
    const isSelected = cart.some(p => p.id === product.id);
    if (isSelected) {
      setCart(cart.filter(p => p.id !== product.id));
    } else {
      setCart([...cart, { ...product, meetings: getMeetings(product) }]);
    }
  };

  const totalPrice = cart.reduce((sum, p) => sum + p.price, 0);
  const totalMeetings = cart.reduce((sum, p) => sum + (p.meetings || getMeetings(p)), 0);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 bg-white/95 backdrop-blur-xl"
      >
        <SheetHeader className="p-4 border-b border-[#e8e8e8] sticky top-0 bg-white/95 backdrop-blur-xl z-10">
          <div className="flex items-center justify-between mb-3">
            <SheetTitle className="text-xl font-semibold text-[#6B584C]">קטלוג מוצרים</SheetTitle>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                showFilters ? "border-[#ADC178] bg-[#ADC178]/10" : "border-[#e8e8e8] hover:border-[#ADC178]"
              )}
            >
              <Filter className="w-4 h-4 text-[#6B584C]" />
              <span className="text-sm text-[#464646]">סינון</span>
            </button>
          </div>

          {/* מחירים לפי סוג עץ */}
          <div className="flex items-center justify-between p-3 bg-[#fafafa] rounded-lg">
            <div className="flex items-center gap-2">
              <TreeDeciduous className="w-4 h-4 text-[#6B584C]" />
              <span className="text-sm text-[#464646]">הצג מחירים עם עץ חדש</span>
            </div>
            <Switch
              checked={showNewWoodPrices}
              onCheckedChange={setShowNewWoodPrices}
            />
          </div>

          {/* פילטרים */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 bg-[#fafafa] rounded-xl space-y-4">
                  <div>
                    <Label className="text-sm text-[#464646] mb-2 flex items-center gap-2">
                      רמת קושי
                    </Label>
                    <Slider
                      value={difficultyFilter}
                      onValueChange={setDifficultyFilter}
                      min={1}
                      max={5}
                      step={0.5}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-[#464646]/70 mt-1">
                      <span>קל</span>
                      <span>מאתגר</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm text-[#464646]">מחיר (₪)</Label>
                    <Slider
                      value={priceFilter}
                      onValueChange={setPriceFilter}
                      min={0}
                      max={1000}
                      step={50}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-[#464646]/70 mt-1">
                      <span>₪{priceFilter[0]}</span>
                      <span>₪{priceFilter[1]}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SheetHeader>

        {/* גריד מוצרים */}
        <div className="flex-1 overflow-y-auto p-4 pb-32 h-[calc(100vh-300px)]">
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map(product => (
              <ProductGridCard
                key={product.id}
                product={product}
                isSelected={cart.some(p => p.id === product.id)}
                onClick={() => toggleProduct(product)}
                meetings={getMeetings(product)}
                showNewWoodPrices={showNewWoodPrices}
              />
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-[#464646]/70">
              לא נמצאו מוצרים התואמים לסינון
            </div>
          )}
        </div>

        {/* סיכום תחתון */}
        <div className="fixed bottom-0 right-0 w-full sm:max-w-xl p-4 bg-white border-t border-[#e8e8e8] shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-[#464646]">
                <Package className="w-4 h-4 text-[#ADC178]" />
                <span>{cart.length} מוצרים</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#464646]">
                <Calendar className="w-4 h-4 text-[#ADC178]" />
                <span>{totalMeetings} מפגשים</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#ADC178]" />
              <span className="text-xl font-bold text-[#ADC178]">₪{totalPrice}</span>
            </div>
          </div>
          <Button
            onClick={onClose}
            className="w-full bg-[#ADC178] hover:bg-[#9ab569] text-white"
          >
            אישור בחירה
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}