import React, { useState, useMemo, useEffect, useRef } from 'react';
import { addLog } from '@/components/VersionLogger';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  X, Filter, Check, Info, Package, Calendar, CreditCard,
  Minus, Plus, ZoomIn
} from 'lucide-react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

// Difficulty functions removed as requested

const MAX_PRODUCTS = 21;

function hasProductImage(product) {
  const u = product?.image;
  if (u == null) return false;
  return String(u).trim().length > 0;
}

function hasProductDimensionInfo(product) {
  const w = product?.width ?? product?.dimensions?.width;
  const d = product?.depth ?? product?.dimensions?.depth;
  const h = product?.height ?? product?.dimensions?.height;
  const meaningful = (v) => {
    if (v === undefined || v === null) return false;
    if (typeof v === 'number') return !Number.isNaN(v) && v > 0;
    const s = String(v).trim();
    return s.length > 0;
  };
  return meaningful(w) || meaningful(d) || meaningful(h);
}

function ProductGridCard({ product, isSelected, onClick, meetings, showNewWoodPrices, onZoom, quantity, onQuantityChange }) {
  const [showDimensions, setShowDimensions] = useState(false);
  const showInfoButton = hasProductDimensionInfo(product);
  const showImage = hasProductImage(product);
  // מחיר המוצר בלי תוספת (התוספת מחושבת בסיכום הכולל)
  const priceDisplay = showNewWoodPrices 
    ? `₪${product.price}` 
    : 'כולל במחיר';

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

      {/* כפתור מידע — רק כשיש מידות להצגה */}
      {showInfoButton && (
        <TooltipProvider>
          <Tooltip open={showDimensions} onOpenChange={setShowDimensions}>
            <TooltipTrigger asChild>
              <button
                type="button"
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
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <button onClick={onClick} className="w-full text-right">
        <div className="aspect-[4/3] overflow-hidden bg-[#FEFAE0] flex items-center justify-center relative group">
          {showImage ? (
            <>
              <img
                src={product.image}
                alt={product.title}
                className="h-full w-full object-contain transition-transform duration-300 hover:scale-105"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onZoom(product.image);
                }}
                className="absolute bottom-2 left-2 rounded-full bg-white/80 p-1.5 transition-colors hover:bg-white"
              >
                <ZoomIn className="h-4 w-4 text-[#6B584C]" />
              </button>
            </>
          ) : (
            <span className="px-2 text-center text-xs leading-snug text-[#464646]/60">
              אין תמונה זמינה
            </span>
          )}
        </div>

        <div className="p-2.5 sm:p-4">
          <h3 className="font-semibold text-[#6B584C] text-sm sm:text-base mb-1.5 sm:mb-2 leading-snug">{product.title}</h3>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1 text-xs text-[#464646]">
              <Calendar className="w-3.5 h-3.5" />
              {/* מציג מפגשים × כמות אם יש יותר מיחידה אחת */}
              <span>
                {isSelected && quantity > 1 
                  ? `${meetings * quantity} מפגשים` 
                  : `${meetings} מפגשים`}
              </span>
            </div>

            {/* הוסר רמת קושי כבקשת המשתמש */}
          </div>

          <div className="flex flex-nowrap items-center justify-between gap-1 pt-2 border-t border-[#e8e8e8] min-w-0">
            <span
              className={cn(
                "font-bold leading-tight min-w-0 shrink text-right",
                showNewWoodPrices
                  ? "text-sm sm:text-lg text-[#ADC178]"
                  : "text-[11px] sm:text-sm text-[#6B584C] whitespace-nowrap"
              )}
            >
              {priceDisplay}
            </span>
            {isSelected && onQuantityChange && (
              <div
                className="flex items-center gap-0.5 sm:gap-1.5 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onQuantityChange(product._id || product.id, -1); }}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-[#e8e8e8] bg-white flex items-center justify-center hover:border-[#ADC178] hover:bg-[#ADC178]/10 transition-colors"
                >
                  <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#6B584C]" />
                </button>
                <span className="text-xs sm:text-sm font-bold text-[#6B584C] min-w-[18px] sm:min-w-[20px] text-center tabular-nums">{quantity || 1}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onQuantityChange(product._id || product.id, 1); }}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-[#e8e8e8] bg-white flex items-center justify-center hover:border-[#ADC178] hover:bg-[#ADC178]/10 transition-colors"
                >
                  <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#6B584C]" />
                </button>
              </div>
            )}
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
  participants,
  wixProducts, // קבלת מוצרים מ-Wix!
  updateQuantity // עדכון כמות מוצר בעגלה
}) {
  const [priceFilter, setPriceFilter] = useState([0, 1000]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedWoodType, setSelectedWoodType] = useState(woodType || 'recycled');
  const [meetingsFilter, setMeetingsFilter] = useState('all'); // 'all' | number-as-string
  const [enlargedImage, setEnlargedImage] = useState(null);
  const productsContainerRef = useRef(null);

  // סנכרון סוג העץ בבחירת הקטלוג כשהחלונית נפתחת (משקף את הבחירה בדף הראשי)
  useEffect(() => {
    if (isOpen && woodType) {
      setSelectedWoodType(woodType);
    }
  }, [isOpen, woodType]);

  // כאשר המשתמש עובר לעץ ממוחזר – סגירת חלון הסינון והחזרת סינון המחיר לברירת מחדל
  useEffect(() => {
    if (selectedWoodType === 'recycled' && showFilters) {
      setShowFilters(false);
    }
    if (selectedWoodType === 'recycled') {
      setPriceFilter([0, 1000]);
    }
  }, [selectedWoodType, showFilters]);

  // חישוב כמות מפגשים לפי סוג עץ נבחר ב-Drawer
  const getLocalMeetings = (product) => {
    const isCouple = participants >= 2;
    const isRecycled = selectedWoodType === 'recycled';

    if (isCouple && isRecycled) return parseInt(product.meetings_couple_recycled) || 0;
    if (isCouple && !isRecycled) return parseInt(product.meetings_couple_new) || 0;
    if (!isCouple && isRecycled) return parseInt(product.meetings_single_recycled) || 0;
    return parseInt(product.meetings_single_new) || 0;
  };

  // שימוש במוצרים מ-Wix, אם אין - fallback
  const products = wixProducts && wixProducts.length > 0 ? wixProducts : FALLBACK_PRODUCTS;

  const meetingOptions = useMemo(() => {
    const values = new Set();
    for (const p of products) {
      const m = getLocalMeetings(p);
      if (m > 0) values.add(m);
    }
    return Array.from(values).sort((a, b) => a - b);
  }, [products, selectedWoodType, participants]);

  const filteredProducts = useMemo(() => {
    const selectedMeetings = meetingsFilter === 'all' ? null : Number(meetingsFilter);

    return products
      .filter(product => {
        // סינון מוצרים שאין להם מפגשים עבור המצב הנוכחי
        const meetings = getLocalMeetings(product);
        if (meetings === 0) return false;

        if (selectedMeetings && meetings !== selectedMeetings) return false;

        return (
          (product.price || 0) >= priceFilter[0] &&
          (product.price || 0) <= priceFilter[1]
        );
      })
      // מיון מוצרים לפי כמות מפגשים (מעט -> הרבה)
      .sort((a, b) => {
        const ma = getLocalMeetings(a);
        const mb = getLocalMeetings(b);
        if (ma !== mb) return ma - mb;
        const ta = (a.title || '').toString();
        const tb = (b.title || '').toString();
        return ta.localeCompare(tb, 'he');
      });
  }, [products, priceFilter, meetingsFilter, selectedWoodType, participants]);

  const MAX_SESSIONS = 8;

  // סה"כ מפגשים נוכחי בעגלה
  const currentTotalMeetings = cart.reduce((sum, p) => sum + (p.meetings || getMeetings(p)) * (p.quantity || 1), 0);

  const toggleProduct = (product) => {
    // תמיכה גם ב-id וגם ב-_id מ-Wix CMS
    const productId = product._id || product.id;
    const isSelected = cart.some(p => (p._id || p.id) === productId);
    if (isSelected) {
      setCart(cart.filter(p => (p._id || p.id) !== productId));
    } else {
      // מגבלה של 21 מוצרים מקסימום
      if (cart.length >= MAX_PRODUCTS) return;
      // מגבלה של 8 מפגשים מקסימום
      const productMeetings = getLocalMeetings(product);
      if (currentTotalMeetings + productMeetings > MAX_SESSIONS) return;
      setCart([...cart, { ...product, id: productId, meetings: getMeetings(product), quantity: 1 }]);
    }
  };

  const totalPriceBase = cart.reduce((sum, p) => sum + p.price * (p.quantity || 1), 0);
  // מציג מחיר מוצרים ללא תוספת (התוספת מחושבת בחלונית הסיכום)
  const totalPrice = totalPriceBase;
  const totalMeetings = cart.reduce((sum, p) => sum + (p.meetings || getMeetings(p)) * (p.quantity || 1), 0);
  const totalItems = cart.reduce((sum, p) => sum + (p.quantity || 1), 0);

  // שליחת הודעה על מצב הקטלוג ל-FloatingSummary (בתוך ה-iframe) ול-VELO (אם צריך)
  useEffect(() => {
    try {
      // שליחה ל-FloatingSummary בתוך ה-iframe
      window.postMessage({
        type: 'CATALOG_STATE_CHANGE',
        data: { isOpen }
      }, '*');
      
      // שליחה ל-Wix VELO (אם עדיין משתמשים ב-CE חיצוני)
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'CATALOG_STATE_CHANGE',
          data: { isOpen }
        }, '*');
      }
      
      addLog(`Catalog ${isOpen ? 'opened' : 'closed'}`, isOpen ? 'info' : 'success');
    } catch (err) {
      addLog(`Failed to send catalog state: ${err.message}`, 'error');
    }
  }, [isOpen]);

  // סגירת הסינון כשמשתמש גולל או לוחץ על מוצר
  // תיקון: הגדרת הפונקציות בתוך ה-useEffect למניעת memory leaks
  useEffect(() => {
    if (!showFilters) return;

    const container = productsContainerRef.current;
    if (!container) return;

    // הגדרה בתוך ה-effect - אותה reference תמיד
    const handleScroll = () => setShowFilters(false);
    
    const handleClick = (e) => {
      const isFilterSection = e.target.closest('[data-filter-section]');
      const isProductCard = e.target.closest('[data-product-card]');
      if (isProductCard && !isFilterSection) {
        setShowFilters(false);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClick);
    };
  }, [showFilters]);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        hideCloseButton
        className="flex h-full max-h-[100dvh] w-full flex-col overflow-hidden p-0 sm:max-w-xl bg-white"
      >
        <SheetClose
          type="button"
          className="absolute left-2 top-1.5 z-[70] flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e8e8] bg-white text-[#6B584C] shadow-sm transition-colors hover:bg-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#ADC178]/40 sm:left-3 sm:top-3"
          aria-label="סגור קטלוג"
        >
          <X className="h-5 w-5" />
        </SheetClose>
        <SheetHeader className="flex flex-col text-center sm:text-left shrink-0 space-y-0 border-b border-[#e8e8e8] bg-white pt-0 pr-1.5 pb-[5px] pl-[98px] md:p-4 md:pl-14 sticky top-0 z-10">
          <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1.5 overflow-x-auto [scrollbar-width:thin] md:gap-2">
            <SheetTitle className="shrink-0 text-right text-base font-bold leading-tight text-[#6B584C] whitespace-nowrap md:text-xl md:font-semibold">
              קטלוג מוצרים
            </SheetTitle>

            <div className="flex shrink-0 items-center">
              <select
                value={selectedWoodType}
                onChange={(e) => setSelectedWoodType(e.target.value)}
                className="h-7 max-w-[9rem] text-[11px] md:h-8 md:max-w-[10rem] md:text-xs px-1.5 md:px-2 rounded-md border border-[#ADC178]/40 bg-white text-[#464646] focus:outline-none focus:ring-2 focus:ring-[#ADC178]/30"
                aria-label="סוג עץ"
              >
                <option value="recycled">עץ ממוחזר</option>
                <option value="new">עץ חדש</option>
              </select>
            </div>

            <div className="flex shrink-0 items-center">
              <select
                value={meetingsFilter}
                onChange={(e) => setMeetingsFilter(e.target.value)}
                className="h-7 max-w-[9rem] text-[11px] md:h-8 md:max-w-[10rem] md:text-xs px-1.5 md:px-2 rounded-md border border-[#ADC178]/40 bg-white text-[#464646] focus:outline-none focus:ring-2 focus:ring-[#ADC178]/30"
                aria-label="סינון לפי מספר מפגשים"
              >
                <option value="all">כל המפגשים</option>
                {meetingOptions.map((m) => (
                  <option key={m} value={String(m)}>{m} מפגשים</option>
                ))}
              </select>
            </div>

            {selectedWoodType === 'new' && (
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border text-[11px] md:text-sm shrink-0",
                  showFilters ? "border-[#ADC178] bg-[#ADC178]/10" : "border-[#e8e8e8] hover:border-[#ADC178]"
                )}
              >
                <Filter className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#6B584C]" />
                <span className="text-[#464646] whitespace-nowrap">מחיר</span>
              </button>
            )}
          </div>

          {/* פילטרים */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
                data-filter-section
              >
                <div className="mt-2 p-3 md:p-4 bg-[#fafafa] rounded-xl space-y-4">
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
                    <div className="flex justify-between text-xs text-[#464646] mt-1">
                      <span>₪{priceFilter[0]}</span>
                      <span>₪{priceFilter[1]}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SheetHeader>

        {/* מובייל: סיכום + המשך מחוץ לאזור הגלילה — נשארים קבועים למעלה בזמן גלילת המוצרים */}
        <div className="shrink-0 border-b border-[#e8e8e8] bg-white px-2 pb-2 pt-0 sm:hidden">
          <div className="rounded-lg border border-[#e8e8e8] bg-[#fafafa] p-2 text-sm text-[#464646]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-3">
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4 shrink-0 text-[#ADC178]" />
                  {cart.length} מוצרים{totalItems > cart.length ? ` (${totalItems} יח')` : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 shrink-0 text-[#ADC178]" />
                  {totalMeetings} מפגשים
                </span>
              </div>
              <span className="flex items-center gap-1 font-medium text-[#6B584C]">
                <CreditCard className="h-4 w-4 text-[#ADC178]" />
                {selectedWoodType === 'recycled' ? 'כלול במחיר' : `₪${totalPrice}`}
              </span>
            </div>
            <Button
              onClick={onClose}
              disabled={cart.length === 0}
              className={`mt-1.5 h-11 w-full text-base font-medium text-white shadow-md ${cart.length > 0
                ? 'bg-[#ADC178] hover:bg-[#9ab569]'
                : 'cursor-not-allowed bg-gray-300'
                }`}
            >
              המשך
            </Button>
          </div>
        </div>

        {/* גריד מוצרים */}
        <div
          ref={productsContainerRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:p-4 sm:pb-4"
        >
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {filteredProducts.map(product => {
              const productId = product._id || product.id;
              const cartItem = cart.find(p => (p._id || p.id) === productId);
              const isSelected = !!cartItem;
              const productMeetings = getLocalMeetings(product);
              const wouldExceedLimit = !isSelected && (currentTotalMeetings + productMeetings > MAX_SESSIONS);
              return (
                <div 
                  key={productId} 
                  data-product-card 
                  onClick={() => {
                    if (wouldExceedLimit) return;
                    toggleProduct(product);
                    setShowFilters(false);
                  }}
                  className={wouldExceedLimit ? 'opacity-40 cursor-not-allowed' : ''}
                  title={wouldExceedLimit ? `מוצר זה דורש ${productMeetings} מפגשים, חורג מהמגבלה של ${MAX_SESSIONS}` : ''}
                >
                  <ProductGridCard
                    product={product}
                    isSelected={isSelected}
                    onClick={() => {}}
                    meetings={getLocalMeetings(product)}
                    showNewWoodPrices={selectedWoodType === 'new'}
                    onZoom={setEnlargedImage}
                    quantity={cartItem?.quantity || 1}
                    onQuantityChange={updateQuantity}
                  />
                </div>
              );
            })}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-[#464646]">
              לא נמצאו מוצרים התואמים לסינון
            </div>
          )}
        </div>

        {/* טאבלט ומעלה: סיכום + המשך בגוף הדף */}
        <div className="hidden sm:block shrink-0 border-t border-[#e8e8e8] bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-[#464646]">
                <Package className="w-4 h-4 text-[#ADC178]" />
                <span>{cart.length} מוצרים{totalItems > cart.length ? ` (${totalItems} יח')` : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#464646]">
                <Calendar className="w-4 h-4 text-[#ADC178]" />
                <span>{totalMeetings} מפגשים</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#ADC178]" />
              {selectedWoodType === 'recycled' ? (
                <span className="text-sm text-[#6B584C]">כלול במחיר</span>
              ) : (
                <span className="text-xl font-bold text-[#ADC178]">₪{totalPrice}</span>
              )}
            </div>
          </div>
          <Button
            onClick={onClose}
            disabled={cart.length === 0}
            className={`h-12 w-full text-base font-medium text-white shadow-md ${cart.length > 0
              ? 'bg-[#ADC178] hover:bg-[#9ab569]'
              : 'cursor-not-allowed bg-gray-300'
              }`}
          >
            המשך
          </Button>
        </div>
      </SheetContent>

      {/* מודל להגדלת תמונה — מותאם לרוחב/גובה המסך (מובייל) */}
      <Dialog
        open={!!enlargedImage}
        onOpenChange={(open) => {
          // חשוב: סוגרים רק כשה-Radix מדווח שה-dialog נסגר (open=false)
          if (!open) setEnlargedImage(null);
        }}
      >
        <DialogContent
          hideCloseButton
          className={cn(
            "z-[300] w-[calc(100vw-1rem)] max-w-[min(100vw-1rem,42rem)] max-h-[92dvh] p-2 sm:p-4",
            "border-none bg-transparent shadow-none",
            "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
            "flex flex-col items-center justify-center gap-0 overflow-visible"
          )}
        >
          <div className="relative w-full max-h-[88dvh] flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setEnlargedImage(null)}
              className="absolute top-1 right-1 z-20 rounded-full p-2 bg-black/55 text-white hover:bg-black/70 sm:top-2 sm:right-2"
              aria-label="סגור"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="w-full max-h-[min(85dvh,calc(100vw))] flex items-center justify-center rounded-lg bg-white shadow-2xl overflow-hidden p-2 sm:p-4">
              <img
                src={enlargedImage}
                alt=""
                className="max-h-[min(80dvh,calc(100vw-2rem))] w-full max-w-full object-contain"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}