import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Check, RotateCcw, Loader2 } from 'lucide-react';

const MAX_DISPLAY = 420;
const MIN_RADIUS = 24;
const HANDLE_HIT = 18;

/**
 * Crop an uploaded image before AI processing.
 * shape: 'square' | 'circle' | 'custom' (freehand sticker-like lasso).
 * Output is a white-backed PNG (outside the crop region is filled white).
 */
export default function SketchImageCropper({ isOpen, imageUrl, shape = 'square', onCancel, onApply }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [dispSize, setDispSize] = useState({ w: 1, h: 1 });

  // square/circle selection (display coords): center + "radius" (half-size)
  const selRef = useRef({ cx: 0, cy: 0, r: 0 });
  // custom lasso points (display coords)
  const pathRef = useRef([]);
  const [hasPath, setHasPath] = useState(false);
  const dragRef = useRef(null); // { mode: 'move'|'resize'|'draw', startX, startY, orig }
  const [, forceTick] = useState(0);
  const redraw = useCallback(() => forceTick((t) => t + 1), []);

  useEffect(() => {
    if (!isOpen || !imageUrl) return;
    setImgLoaded(false);
    pathRef.current = [];
    setHasPath(false);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const scale = Math.min(1, MAX_DISPLAY / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      setDispSize({ w, h });
      const r = Math.round(Math.min(w, h) * 0.4);
      selRef.current = { cx: w / 2, cy: h / 2, r };
      setImgLoaded(true);
    };
    img.src = imageUrl;
  }, [isOpen, imageUrl, shape]);

  // Draw canvas: image + dim outside selection + outline
  useEffect(() => {
    if (!imgLoaded) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const { w, h } = dispSize;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const { cx, cy, r } = selRef.current;
    const buildSelectionPath = () => {
      ctx.beginPath();
      if (shape === 'circle') {
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      } else if (shape === 'square') {
        ctx.rect(cx - r, cy - r, r * 2, r * 2);
      } else {
        const pts = pathRef.current;
        if (pts.length < 3) return false;
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
      }
      return true;
    };

    // Dim everything, then "hole" over the selection (skip while no lasso yet)
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    const ok = buildSelectionPath();
    if (ok) ctx.fill('evenodd');
    ctx.restore();

    if (ok) {
      ctx.save();
      buildSelectionPath();
      ctx.strokeStyle = '#5E2F88';
      ctx.lineWidth = 2.5;
      ctx.setLineDash(shape === 'custom' ? [6, 4] : []);
      ctx.stroke();
      ctx.restore();

      if (shape !== 'custom') {
        // resize handle (bottom-left corner for RTL friendliness)
        const hx = shape === 'circle' ? cx + r * Math.SQRT1_2 : cx + r;
        const hy = shape === 'circle' ? cy + r * Math.SQRT1_2 : cy + r;
        ctx.beginPath();
        ctx.arc(hx, hy, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#5E2F88';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  });

  const getPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cX = e.touches ? e.touches[0].clientX : e.clientX;
    const cY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(dispSize.w, cX - rect.left)),
      y: Math.max(0, Math.min(dispSize.h, cY - rect.top)),
    };
  }, [dispSize]);

  const onPointerDown = useCallback((e) => {
    if (!imgLoaded) return;
    if (e.cancelable) e.preventDefault();
    const p = getPos(e);
    if (shape === 'custom') {
      pathRef.current = [p];
      setHasPath(false);
      dragRef.current = { mode: 'draw' };
      redraw();
      return;
    }
    const { cx, cy, r } = selRef.current;
    const hx = shape === 'circle' ? cx + r * Math.SQRT1_2 : cx + r;
    const hy = shape === 'circle' ? cy + r * Math.SQRT1_2 : cy + r;
    const distHandle = Math.hypot(p.x - hx, p.y - hy);
    if (distHandle <= HANDLE_HIT) {
      dragRef.current = { mode: 'resize' };
    } else {
      dragRef.current = { mode: 'move', startX: p.x, startY: p.y, orig: { ...selRef.current } };
    }
  }, [imgLoaded, shape, getPos, redraw]);

  const onPointerMove = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (e.cancelable) e.preventDefault();
    const p = getPos(e);
    if (drag.mode === 'draw') {
      const pts = pathRef.current;
      const last = pts[pts.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) > 3) {
        pts.push(p);
        redraw();
      }
      return;
    }
    const sel = selRef.current;
    if (drag.mode === 'resize') {
      const dist = Math.hypot(p.x - sel.cx, p.y - sel.cy);
      const raw = shape === 'circle' ? dist : Math.max(Math.abs(p.x - sel.cx), Math.abs(p.y - sel.cy));
      const maxR = Math.min(sel.cx, sel.cy, dispSize.w - sel.cx, dispSize.h - sel.cy);
      sel.r = Math.max(MIN_RADIUS, Math.min(raw, maxR));
    } else {
      const nx = drag.orig.cx + (p.x - drag.startX);
      const ny = drag.orig.cy + (p.y - drag.startY);
      sel.cx = Math.max(sel.r, Math.min(dispSize.w - sel.r, nx));
      sel.cy = Math.max(sel.r, Math.min(dispSize.h - sel.r, ny));
    }
    redraw();
  }, [shape, getPos, dispSize, redraw]);

  const onPointerUp = useCallback(() => {
    const drag = dragRef.current;
    if (drag?.mode === 'draw') {
      if (pathRef.current.length >= 3) setHasPath(true);
      else pathRef.current = [];
      redraw();
    }
    dragRef.current = null;
  }, [redraw]);

  useEffect(() => {
    if (!isOpen) return undefined;
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, [isOpen, onPointerMove, onPointerUp]);

  const canApply = imgLoaded && (shape !== 'custom' || hasPath);

  const handleApply = useCallback(() => {
    if (!canApply) return;
    const img = imgRef.current;
    const scale = img.naturalWidth / dispSize.w;
    const out = document.createElement('canvas');
    const ctx2 = () => out.getContext('2d');

    if (shape === 'custom') {
      const pts = pathRef.current;
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const bw = Math.max(...xs) - minX;
      const bh = Math.max(...ys) - minY;
      out.width = Math.max(1, Math.round(bw * scale));
      out.height = Math.max(1, Math.round(bh * scale));
      const ctx = ctx2();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo((pts[0].x - minX) * scale, (pts[0].y - minY) * scale);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo((pts[i].x - minX) * scale, (pts[i].y - minY) * scale);
      }
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, -minX * scale, -minY * scale, img.naturalWidth, img.naturalHeight);
      ctx.restore();
    } else {
      const { cx, cy, r } = selRef.current;
      const size = Math.max(1, Math.round(r * 2 * scale));
      out.width = size;
      out.height = size;
      const ctx = ctx2();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.save();
      if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
      }
      ctx.drawImage(img, -(cx - r) * scale, -(cy - r) * scale, img.naturalWidth, img.naturalHeight);
      ctx.restore();
    }

    onApply({
      base64: out.toDataURL('image/png'),
      width: out.width,
      height: out.height,
    });
  }, [canApply, shape, dispSize, onApply]);

  const clearPath = useCallback(() => {
    pathRef.current = [];
    setHasPath(false);
    redraw();
  }, [redraw]);

  if (!isOpen) return null;

  const hint = shape === 'custom'
    ? 'ציירו עם האצבע/עכבר צורה סגורה סביב האזור שתרצו לשמור'
    : shape === 'circle'
    ? 'גררו את העיגול למיקום הרצוי, ושנו גודל בעזרת הידית'
    : 'גררו את הריבוע למיקום הרצוי, ושנו גודל בעזרת הידית';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl w-full max-w-lg p-4 shadow-2xl relative max-h-[92dvh] overflow-y-auto"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#464646] hover:bg-[#e8e8e8]"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-bold text-lg text-[#581E83] mb-1 text-center">חיתוך התמונה</h3>
        <p className="text-[13px] text-[#464646]/60 text-center mb-3">{hint}</p>

        <div className="flex items-center justify-center bg-[#fafafa] rounded-xl border border-[#e8e8e8] p-2 min-h-[200px]">
          {!imgLoaded ? (
            <Loader2 className="w-8 h-8 text-[#5E2F88] animate-spin" />
          ) : (
            <canvas
              ref={canvasRef}
              style={{ width: dispSize.w, height: dispSize.h, maxWidth: '100%', touchAction: 'none', cursor: 'crosshair' }}
              className="rounded-lg shadow-sm"
              onMouseDown={onPointerDown}
              onTouchStart={onPointerDown}
            />
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={handleApply}
            disabled={!canApply}
            className="flex-1 bg-[#5E2F88] hover:bg-[#7B3DB0] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" /> אישור חיתוך
          </button>
          {shape === 'custom' && hasPath && (
            <button
              type="button"
              onClick={clearPath}
              className="bg-white border-2 border-[#e8e8e8] hover:border-[#464646]/30 text-[#464646] font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" /> ציור מחדש
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="bg-[#f5f5f5] hover:bg-[#e8e8e8] text-[#464646] font-bold py-2.5 px-4 rounded-xl transition-colors"
          >
            ביטול
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
