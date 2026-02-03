import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  X, Filter, Check, Info, Package, Calendar, CreditCard,
  TreeDeciduous, Minus
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

// אייקון רמת קושי עם פסים עולים
function DifficultyBars({ difficulty }) {
  if (!difficulty && difficulty !== 0) {
    return <span className="text-sm text-[#464646]/70">-</span>;
  }

  const level = Math.round(difficulty);
  const bars = Math.min(Math.max(level, 1), 5);

  // צבעים לפי רמת קושי
  const getColor = () => {
    if (bars <= 1) return 'bg-green-500';
    if (bars <= 2) return 'bg-lime-500';
    if (bars <= 3) return 'bg-yellow-500';
    if (bars <= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-end gap-0.5 h-4">
      {[1, 2, 3, 4, 5].map((bar) => (
        <div
          key={bar}
          className={`w-1.5 rounded-sm transition-all ${bar <= bars ? getColor() : 'bg-gray-200'
            }`}
          style={{ height: `${bar * 3 + 4}px` }}
        />
      ))}
    </div>
  );
}

function getDifficultyLabel(difficulty) {
  if (!difficulty && difficulty !== 0) return '-';
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
              {(product.width || product.dimensions?.width) && (
                <p>רוחב: {product.width || product.dimensions?.width} ס״מ</p>
              )}
              {(product.depth || product.dimensions?.depth) && (
                <p>עומק: {product.depth || product.dimensions?.depth} ס״מ</p>
              )}
              {(product.height || product.dimensions?.height) && (
                <p>גובה: {product.height || product.dimensions?.height} ס״מ</p>
              )}
              {!product.width && !product.depth && !product.height && !product.dimensions && (
                <p>אין מידע על מידות</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <button onClick={onClick} className="w-full text-right">
        <div className="aspect-[4/3] overflow-hidden bg-[#FEFAE0] flex items-center justify-center">
          <img
            src={product.image || "https://images.unsplash.com/photo-1588117472556-1ddf8c5c3c68?w=400"}
            alt={product.title}
            className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
          />
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-[#6B584C] text-base mb-2">{product.title}</h3>

          <div className="flex items-center justify-between mb-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <DifficultyBars difficulty={product.difficulty} />
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
    // תמיכה גם ב-id וגם ב-_id מ-Wix CMS
    const productId = product._id || product.id;
    const isSelected = cart.some(p => (p._id || p.id) === productId);
    if (isSelected) {
      setCart(cart.filter(p => (p._id || p.id) !== productId));
    } else {
      setCart([...cart, { ...product, id: productId, meetings: getMeetings(product) }]);
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
            {filteredProducts.map(product => {
              const productId = product._id || product.id;
              return (
                <ProductGridCard
                  key={productId}
                  product={product}
                  isSelected={cart.some(p => (p._id || p.id) === productId)}
                  onClick={() => toggleProduct(product)}
                  meetings={getMeetings(product)}
                  showNewWoodPrices={showNewWoodPrices}
                />
              );
            })}
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
            disabled={cart.length === 0}
            className={`w-full text-white transition-all ${cart.length > 0
              ? 'bg-[#ADC178] hover:bg-[#9ab569]'
              : 'bg-gray-300 cursor-not-allowed'
              }`}
          >
            {cart.length > 0 ? `אישור בחירה (${cart.length} מוצרים)` : 'בחר לפחות מוצר אחד'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}