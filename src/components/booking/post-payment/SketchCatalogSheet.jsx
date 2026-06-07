import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { X, Check, ZoomIn, Search, ChevronDown, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

function getDifficultyLabel(product) {
  const raw = product.difficulty;
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw[0] || '';
  return '';
}

function isHardDifficulty(label) {
  if (!label) return false;
  const l = label.toLowerCase();
  return l === 'קשה' || l === 'hard' || l === 'מאתגר';
}

function ProductCard({ product, isSelected, onPick, onZoom, disabled }) {
  const difficultyLabel = getDifficultyLabel(product);
  const hard = isHardDifficulty(difficultyLabel);

  return (
    <motion.div
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={cn(
        'relative bg-white rounded-xl overflow-hidden border-2 transition-all duration-300',
        isSelected
          ? 'border-[#5E2F88] shadow-lg'
          : 'border-[#e8e8e8] hover:border-[#5E2F88]/50 hover:shadow-md',
        disabled && !isSelected && 'opacity-50'
      )}
    >
      {isSelected && (
        <div className="absolute top-3 left-3 z-10 w-6 h-6 rounded-full bg-[#5E2F88] flex items-center justify-center shadow-md">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      <button
        type="button"
        onClick={() => !disabled && onPick(product)}
        disabled={disabled}
        className="w-full text-right disabled:cursor-not-allowed"
      >
        <div className="aspect-[4/3] overflow-hidden bg-[#E4C1F9]/30 flex items-center justify-center relative">
          {product.image ? (
            <>
              <img
                src={product.image}
                alt={product.title}
                className="h-full w-full object-contain transition-transform duration-300 hover:scale-105"
                loading="lazy"
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

        <div className="p-2.5 sm:p-3">
          <h3 className="font-semibold text-[#581E83] text-sm sm:text-base mb-1 leading-snug">
            {product.title}
          </h3>
          {difficultyLabel && (
            <div className="flex items-center gap-1 pt-1.5 border-t border-[#e8e8e8]">
              <span className="text-xs sm:text-sm text-[#464646]/70">{difficultyLabel}</span>
              {hard && (
                <span className="text-[10px] text-orange-500 flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" />
                  דורש ניסיון
                </span>
              )}
            </div>
          )}
        </div>
      </button>
    </motion.div>
  );
}

export default function SketchCatalogSheet({
  isOpen,
  onClose,
  catalog = [],
  selectedProductId,
  onPick,
  slotLabel,
  readOnly = false,
}) {
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const searchTimerRef = useRef(null);

  const handleSearchChange = useCallback((value) => {
    setSearchText(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 500);
  }, []);

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchText('');
      setDebouncedSearch('');
      setDifficultyFilter('');
    }
  }, [isOpen]);

  const difficultyOptions = useMemo(() => {
    const set = new Set();
    catalog.forEach((p) => {
      const d = getDifficultyLabel(p);
      if (d) set.add(d);
    });
    return Array.from(set);
  }, [catalog]);

  const filteredProducts = useMemo(() => {
    let result = [...catalog];

    if (difficultyFilter) {
      result = result.filter((p) => getDifficultyLabel(p) === difficultyFilter);
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      result = result.filter(
        (p) =>
          (p.title || '').toLowerCase().includes(q) ||
          (p.productName || '').toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) =>
      (a.title || '').toString().localeCompare((b.title || '').toString(), 'he')
    );
  }, [catalog, debouncedSearch, difficultyFilter]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        hideCloseButton
        className="flex h-full max-h-[100dvh] w-full flex-col overflow-hidden p-0 sm:max-w-xl"
        style={{ backgroundColor: '#E4C1F9' }}
      >
        <SheetHeader className="flex flex-col shrink-0 space-y-0 border-b border-[#e8e8e8] bg-white px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f5f5] text-[#581E83] hover:bg-[#e8e8e8] transition-colors"
              aria-label="סגור קטלוג"
            >
              <X className="h-5 w-5" />
            </button>
            <SheetTitle className="text-lg font-bold text-[#581E83]">
              קטלוג העיצובים
            </SheetTitle>
            <div className="w-8" />
          </div>

          {slotLabel && (
            <p className="text-xs text-center text-[#464646]/70 mb-2">{slotLabel}</p>
          )}

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#464646]/50" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="חיפוש עיצוב..."
                className="w-full h-9 pr-8 pl-3 rounded-lg border border-[#e8e8e8] text-sm text-[#464646] placeholder:text-[#464646]/40 focus:outline-none focus:border-[#5E2F88] transition-colors"
                dir="rtl"
              />
            </div>

            <div className="relative">
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="h-9 pl-7 pr-3 rounded-lg border border-[#e8e8e8] text-sm text-[#464646] bg-white appearance-none focus:outline-none focus:border-[#5E2F88] transition-colors cursor-pointer"
                dir="rtl"
              >
                <option value="">כל הרמות</option>
                {difficultyOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#464646]/50 pointer-events-none" />
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:p-4">
          {filteredProducts.length === 0 ? (
            <p className="text-center text-sm text-[#464646] py-8">
              לא נמצאו עיצובים תואמים לחיפוש שלך
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              {filteredProducts.map((product) => {
                const productId = product._id || product.id;
                const isSelected = selectedProductId === productId;
                return (
                  <ProductCard
                    key={productId}
                    product={product}
                    isSelected={isSelected}
                    onPick={(p) => {
                      if (!readOnly) {
                        onPick(p);
                        onClose();
                      }
                    }}
                    onZoom={setEnlargedImage}
                    disabled={readOnly}
                  />
                );
              })}
            </div>
          )}
        </div>

        {readOnly && (
          <div className="shrink-0 border-t border-[#5E2F88]/20 bg-[#E4C1F9] px-4 py-3 text-center text-xs text-[#464646]/70">
            צפייה בלבד — הבחירה נעולה
          </div>
        )}
      </SheetContent>

      <Dialog open={!!enlargedImage} onOpenChange={(open) => { if (!open) setEnlargedImage(null); }}>
        <DialogContent
          hideCloseButton
          className="z-[300] w-[calc(100vw-1rem)] max-w-[min(100vw-1rem,42rem)] max-h-[92dvh] p-2 sm:p-4 border-none bg-transparent shadow-none"
        >
          <div className="relative w-full flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setEnlargedImage(null)}
              className="absolute top-1 right-1 z-20 rounded-full p-2 bg-black/55 text-white hover:bg-black/70"
              aria-label="סגור"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-full flex items-center justify-center rounded-lg bg-white shadow-2xl overflow-hidden p-2 sm:p-4">
              <img src={enlargedImage} alt="" className="max-h-[80dvh] w-full object-contain" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
