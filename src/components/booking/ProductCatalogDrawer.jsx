import React, { useState, useMemo, useEffect, useRef } from 'react';
import { addLog } from '@/components/VersionLogger';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { X, Check, Info, Package, ZoomIn, Minus, Plus } from 'lucide-react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const FALLBACK_PRODUCTS = [
  { id: 'fallback-1', title: 'טוען שטיחים...', price: 0, difficulty: 'קל', image: null }
];

const DIFFICULTY_LABELS = {
  1: 'קל',
  2: 'בינוני',
  3: 'מאתגר',
  easy: 'קל',
  medium: 'בינוני',
  hard: 'מאתגר'
};

function getDifficultyLabel(product) {
  if (product.difficulty) {
    if (typeof product.difficulty === 'string') {
      return DIFFICULTY_LABELS[product.difficulty.toLowerCase()] || product.difficulty;
    }
    return DIFFICULTY_LABELS[product.difficulty] || 'קל';
  }
  return 'קל';
}

function hasProductImage(product) {
  const u = product?.image;
  if (u == null) return false;
  return String(u).trim().length > 0;
}

function hasProductDimensionInfo(product) {
  const w = product?.width ?? product?.dimensions?.width;
  const d = product?.depth ?? product?.dimensions?.depth;
  const h = product?.height ?? product?.dimensions?.height;
  const dimText = typeof product?.dimensions === 'string' ? product.dimensions.trim() : '';
  const meaningful = (v) => {
    if (v === undefined || v === null) return false;
    if (typeof v === 'number') return !Number.isNaN(v) && v > 0;
    const s = String(v).trim();
    return s.length > 0;
  };
  return meaningful(dimText) || meaningful(w) || meaningful(d) || meaningful(h);
}

function ProductGridCard({ product, isSelected, onClick, onZoom, quantity, onQuantityChange, canIncrease }) {
  const [showDimensions, setShowDimensions] = useState(false);
  const showInfoButton = hasProductDimensionInfo(product);
  const showImage = hasProductImage(product);
  const dimText = typeof product?.dimensions === 'string' ? product.dimensions.trim() : '';
  const difficultyLabel = getDifficultyLabel(product);

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative bg-white rounded-xl overflow-hidden border-2 transition-all duration-300",
        isSelected
          ? "border-[#5E2F88] shadow-lg"
          : "border-[#e8e8e8] hover:border-[#5E2F88]/50 hover:shadow-md"
      )}
    >
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 left-3 z-10 w-6 h-6 rounded-full bg-[#5E2F88] flex items-center justify-center shadow-md"
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      )}

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
                <Info className="w-4 h-4 text-[#581E83]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="z-[500] bg-white border border-[#e8e8e8] p-3">
              <div className="text-sm text-[#464646]">
                <p className="font-medium mb-1">מידות:</p>
                {dimText && <p className="whitespace-pre-wrap">{dimText}</p>}
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
        <div className="aspect-[4/3] overflow-hidden bg-[#E4C1F9]/30 flex items-center justify-center relative group">
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
                <ZoomIn className="h-4 w-4 text-[#581E83]" />
              </button>
            </>
          ) : (
            <span className="px-2 text-center text-xs leading-snug text-[#464646]/60">
              אין תמונה זמינה
            </span>
          )}
        </div>

        <div className="p-2.5 sm:p-4">
          <h3 className="font-semibold text-[#581E83] text-sm sm:text-base mb-1.5 sm:mb-2 leading-snug">{product.title}</h3>

          <div className="flex flex-nowrap items-center justify-between gap-1 pt-2 border-t border-[#e8e8e8] min-w-0">
            <span className="text-xs sm:text-sm text-[#464646]/70">
              רמת קושי: {difficultyLabel}
            </span>
            {isSelected && onQuantityChange && (
              <div
                className="flex items-center gap-0.5 sm:gap-1.5 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onQuantityChange(product._id || product.id, -1); }}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-[#e8e8e8] bg-white flex items-center justify-center hover:border-[#5E2F88] hover:bg-[#5E2F88]/10 transition-colors"
                >
                  <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#581E83]" />
                </button>
                <span className="text-xs sm:text-sm font-bold text-[#581E83] min-w-[18px] sm:min-w-[20px] text-center tabular-nums">{quantity || 1}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); if (canIncrease) onQuantityChange(product._id || product.id, 1); }}
                  disabled={!canIncrease}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-[#e8e8e8] bg-white flex items-center justify-center hover:border-[#5E2F88] hover:bg-[#5E2F88]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#581E83]" />
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
  totalCarpets,
  wixProducts,
  updateQuantity
}) {
  const [enlargedImage, setEnlargedImage] = useState(null);
  const productsContainerRef = useRef(null);

  const products = wixProducts && wixProducts.length > 0 ? wixProducts : FALLBACK_PRODUCTS;

  const filteredProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const ta = (a.title || '').toString();
      const tb = (b.title || '').toString();
      return ta.localeCompare(tb, 'he');
    });
  }, [products]);

  const totalItems = cart.reduce((sum, p) => sum + (p.quantity || 1), 0);

  const toggleProduct = (product) => {
    const productId = product._id || product.id;
    const isSelected = cart.some(p => (p._id || p.id) === productId);
    if (isSelected) {
      setCart(cart.filter(p => (p._id || p.id) !== productId));
    } else {
      if (totalItems >= totalCarpets) return;
      setCart([...cart, { 
        ...product, 
        id: productId, 
        meetings: getMeetings(product), 
        quantity: 1,
        difficulty: getDifficultyLabel(product)
      }]);
    }
  };

  useEffect(() => {
    try {
      window.postMessage({
        type: 'CATALOG_STATE_CHANGE',
        data: { isOpen }
      }, '*');
      
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
        className="flex h-full max-h-[100dvh] w-full flex-col overflow-hidden p-0 sm:max-w-xl"
        style={{ backgroundColor: '#E4C1F9' }}
      >
        <SheetHeader className="flex flex-col text-center sm:text-left shrink-0 space-y-0 border-b border-[#5E2F88]/20 bg-[#E4C1F9] px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[#581E83] hover:bg-white transition-colors"
              aria-label="סגור קטלוג"
            >
              <X className="h-5 w-5" />
            </button>
            <SheetTitle className="text-lg font-bold text-[#581E83] md:text-xl">
              קטלוג השטיחים שלנו
            </SheetTitle>
            <div className="w-8" />
          </div>
        </SheetHeader>

        {/* מובייל: סיכום + המשך */}
        <div className="shrink-0 border-b border-[#5E2F88]/20 bg-[#E4C1F9] px-2 pb-2 pt-0 sm:hidden">
          <div className="rounded-lg border border-[#5E2F88]/20 bg-white/80 p-2 text-sm text-[#464646]">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1">
                <Package className="h-4 w-4 shrink-0 text-[#5E2F88]" />
                {totalItems}/{totalCarpets} שטיחים נבחרו
              </span>
            </div>
            <Button
              onClick={onClose}
              disabled={cart.length === 0}
              className={`mt-1.5 h-11 w-full text-base font-medium text-white shadow-md ${cart.length > 0
                ? 'bg-[#5E2F88] hover:bg-[#7B3DB0]'
                : 'cursor-not-allowed bg-gray-300'
                }`}
            >
              המשך
            </Button>
          </div>
        </div>

        {/* גריד שטיחים */}
        <div
          ref={productsContainerRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:p-4 sm:pb-4"
        >
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {filteredProducts.map(product => {
              const productId = product._id || product.id;
              const cartItem = cart.find(p => (p._id || p.id) === productId);
              const isSelected = !!cartItem;
              const canAddMore = totalItems < totalCarpets;
              return (
                <div 
                  key={productId} 
                  data-product-card 
                  onClick={() => {
                    if (!isSelected && !canAddMore) return;
                    toggleProduct(product);
                  }}
                  className={!isSelected && !canAddMore ? 'opacity-40 cursor-not-allowed' : ''}
                  title={!isSelected && !canAddMore ? `כבר בחרת ${totalCarpets} עיצובים` : ''}
                >
                  <ProductGridCard
                    product={product}
                    isSelected={isSelected}
                    onClick={() => {}}
                    onZoom={setEnlargedImage}
                    quantity={cartItem?.quantity || 1}
                    onQuantityChange={updateQuantity}
                    canIncrease={totalItems < totalCarpets}
                  />
                </div>
              );
            })}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-[#464646]">
              לא נמצאו שטיחים
            </div>
          )}
        </div>

        {/* טאבלט ומעלה: סיכום + המשך */}
        <div className="hidden sm:block shrink-0 border-t border-[#5E2F88]/20 bg-[#E4C1F9] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[#464646]">
              <Package className="w-4 h-4 text-[#5E2F88]" />
              <span>{totalItems}/{totalCarpets} שטיחים נבחרו</span>
            </div>
          </div>
          <Button
            onClick={onClose}
            disabled={cart.length === 0}
            className={`h-12 w-full text-base font-medium text-white shadow-md ${cart.length > 0
              ? 'bg-[#5E2F88] hover:bg-[#7B3DB0]'
              : 'cursor-not-allowed bg-gray-300'
              }`}
          >
            המשך
          </Button>
        </div>
      </SheetContent>

      {/* מודל להגדלת תמונה */}
      <Dialog
        open={!!enlargedImage}
        onOpenChange={(open) => {
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
