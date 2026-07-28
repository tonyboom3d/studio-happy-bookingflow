import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, Loader2, Check, ChevronLeft, ChevronRight,
  RotateCcw, Image as ImageIcon, Info, AlertTriangle, MessageSquare,
  Sparkles, Star, GripHorizontal, Plus, Trash2, ZoomIn,
  Square, Circle, Shapes, Crop as CropIcon,
} from 'lucide-react';
import ImageCropModal from './ImageCropModal';

const FRAME_OPTIONS = [
  { id: 'square', label: 'ריבוע', Icon: Square },
  { id: 'circle', label: 'עיגול', Icon: Circle },
  { id: 'custom', label: 'צורה חופשית', Icon: Shapes },
];

export const FRAME_TYPE_LABELS = {
  square: 'ריבוע',
  circle: 'עיגול',
  custom: 'צורה חופשית',
};

const STEPS = ['העלאה', 'אישור', 'סקיצה'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ATTEMPTS = 7;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

function validateImageFile(file) {
  if (!file) return 'לא נבחר קובץ';
  if (file.size > MAX_FILE_SIZE) return 'הקובץ גדול מדי. גודל מקסימלי: 5MB';

  const extOk = ALLOWED_IMAGE_EXT.test(file.name || '');
  const typeOk = ALLOWED_IMAGE_TYPES.has(file.type) || (!file.type && extOk);

  if (!typeOk) {
    if (file.type === 'image/heic' || file.type === 'image/heif' || /\.heic$/i.test(file.name)) {
      return 'פורמט HEIC לא נתמך. יש להמיר את התמונה ל-JPG או PNG';
    }
    if (file.type === 'image/gif' || /\.gif$/i.test(file.name)) {
      return 'GIF לא נתמך. יש להעלות JPG, PNG או WEBP';
    }
    if (file.type.startsWith('image/')) {
      return `פורמט ${file.type.replace('image/', '').toUpperCase()} לא נתמך. יש להעלות JPG, PNG או WEBP`;
    }
    return 'פורמט לא נתמך. יש להעלות קובץ JPG, PNG או WEBP בלבד';
  }
  return null;
}

const LOADING_SUBTITLES_VALIDATE = [
  'בודק איכות וחדות...',
  'מוודא התאמה לתפירה בטאפטינג...',
  'סורק למניעת תוכן לא הולם...',
  'מכין את הבד הווירטואלי...',
];

const LOADING_SUBTITLES_GENERATE = [
  'מפעיל קסמי AI...',
  'מפשט קווים וצורות...',
  'מסיר רקע ומבודד את האובייקט...',
  'מכין קובץ סופי...',
];

const AI_RATE_LIMIT_MESSAGE = 'הגעתם למגבלת הניסיונות. אנא המתינו כ-30 דקות לפני שתוכלו לנסות שוב.';
const SKETCH_PROGRESS_DURATION_MS = 40000;
const RESULT_BUFFER_MS = 5000;
const STARS_DURATION_MS = 2500;

function isRateLimitResponse(result) {
  if (!result) return false;
  if (result.isAllowed === false) return true;
  const text = result.reason || result.message || '';
  return text.includes('מגבלת') && text.includes('ניסיונות');
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImageDimensionsFromFile(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 1, height: 1 });
    };
    img.src = url;
  });
}

function getImageFrameStyle(aspectRatio, maxHeight = 360) {
  const ratio = aspectRatio && aspectRatio > 0 ? aspectRatio : 1;
  return {
    aspectRatio: String(ratio),
    width: '100%',
    maxHeight: `${maxHeight}px`,
  };
}

function Stepper({ step }) {
  const pct = step === 0 ? 0 : step === 1 ? 50 : 100;
  return (
    <div className="px-6 pt-4 pb-1">
      <div className="flex items-center justify-between relative max-w-xs mx-auto">
        <div className="absolute right-0 top-4 -translate-y-1/2 w-full h-1.5 bg-[#e8e8e8] -z-10 rounded-full" />
        <div
          className="absolute right-0 top-4 -translate-y-1/2 h-1.5 bg-[#5E2F88] -z-10 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
        {STEPS.map((label, i) => (
          <div key={i} className="flex flex-col items-center relative bg-white px-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-colors z-10 ${
                i < step
                  ? 'bg-[#5E2F88] text-white'
                  : i === step
                  ? 'bg-[#5E2F88] text-white ring-4 ring-[#f5f0fa]'
                  : 'bg-[#e8e8e8] text-[#464646]/50'
              }`}
            >
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs mt-1.5 ${
              i <= step ? 'text-[#5E2F88] font-bold' : 'text-[#464646]/50'
            }`}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingView({ title, subtitles, progress }) {
  const [subIdx, setSubIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setSubIdx(prev => (prev + 1) % subtitles.length);
        setFade(true);
      }, 250);
    }, 1400);
    return () => clearInterval(iv);
  }, [subtitles]);

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="w-20 h-20 mb-5 relative">
        <Loader2 className="w-full h-full text-[#5E2F88] animate-spin" />
        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-[#5E2F88]" />
      </div>
      <h2 className="text-lg font-bold text-[#581E83] mb-1.5">{title}</h2>
      <p className={`text-sm text-[#464646]/70 h-5 transition-opacity duration-250 ${fade ? 'opacity-100' : 'opacity-0'}`}>
        {subtitles[subIdx]}
      </p>
      <div className="w-full max-w-[240px] bg-[#e8e8e8] rounded-full h-2 mt-5">
        <div
          className="bg-[#5E2F88] h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function StarsBurst() {
  const stars = useMemo(
    () => Array.from({ length: 16 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.7,
      size: 12 + Math.random() * 18,
      dur: 1.5 + Math.random() * 0.9,
      drift: (Math.random() - 0.5) * 60,
    })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-2xl">
      {stars.map((s) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 20, x: 0 }}
          animate={{ opacity: [0, 0.7, 0.7, 0], y: -340, x: s.drift }}
          transition={{ duration: s.dur, delay: s.delay, ease: 'easeOut' }}
          style={{ position: 'absolute', bottom: 0, left: `${s.left}%` }}
        >
          <Star style={{ width: s.size, height: s.size, color: '#facc15', opacity: 0.6 }} fill="#facc15" strokeWidth={0} />
        </motion.div>
      ))}
    </div>
  );
}

function CompareSlider({ originalUrl, sketchUrl, aspectRatio = 1, hintTrigger = 0 }) {
  const containerRef = useRef(null);
  const [pct, setPct] = useState(50);
  const dragging = useRef(false);
  const [lightbox, setLightbox] = useState(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [hinting, setHinting] = useState(false);
  const frameStyle = getImageFrameStyle(aspectRatio, 360);

  useEffect(() => {
    if (!sketchUrl || !originalUrl) return;
    setImagesLoaded(false);
    let loaded = 0;
    const check = () => { loaded++; if (loaded >= 2) setImagesLoaded(true); };
    const img1 = new Image();
    img1.onload = check;
    img1.onerror = check;
    img1.src = sketchUrl;
    const img2 = new Image();
    img2.onload = check;
    img2.onerror = check;
    img2.src = originalUrl;
  }, [sketchUrl, originalUrl]);

  const update = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    let p = ((clientX - rect.left) / rect.width) * 100;
    p = Math.max(0, Math.min(100, p));
    setPct(p);
  }, []);

  const startDrag = useCallback((e) => {
    dragging.current = true;
    setHinting(false);
    if (e.cancelable) e.preventDefault();
  }, []);
  const stopDrag = useCallback(() => { dragging.current = false; }, []);
  const onMove = useCallback((e) => {
    if (!dragging.current) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    update(x);
  }, [update]);

  useEffect(() => {
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchend', stopDrag);
    window.addEventListener('mouseleave', stopDrag);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    return () => {
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchend', stopDrag);
      window.removeEventListener('mouseleave', stopDrag);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
    };
  }, [onMove, stopDrag]);

  // Phase C: automated drag-handle hint (center -> right -> left -> center)
  useEffect(() => {
    if (!hintTrigger || !imagesLoaded) return;
    setHinting(true);
    setPct(50);
    const t1 = setTimeout(() => setPct(85), 250);
    const t2 = setTimeout(() => setPct(15), 1100);
    const t3 = setTimeout(() => setPct(50), 1950);
    const t4 = setTimeout(() => setHinting(false), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [hintTrigger, imagesLoaded]);

  if (!imagesLoaded) {
    return (
      <div
        className="relative w-full rounded-2xl shadow-xl border-4 border-white bg-white mx-auto flex items-center justify-center"
        style={frameStyle}
      >
        <Loader2 className="w-10 h-10 text-[#5E2F88] animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl shadow-xl border-4 border-white select-none overflow-hidden touch-none bg-white mx-auto isolate"
      style={frameStyle}
      onMouseDown={startDrag}
      onTouchStart={startDrag}
    >
      {/* Sketch is the white-backed base; transparent pixels never reveal the source photo. */}
      <div className="absolute inset-0 z-0 bg-white">
        <img
          src={sketchUrl}
          alt="Sketch"
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain bg-white"
          style={{ backgroundColor: '#ffffff' }}
        />
      </div>

      {/* Original / cropped input — left side only, layered above the sketch. */}
      <div
        className="absolute inset-0 z-10 bg-white"
        style={{
          clipPath: `polygon(0 0, ${pct}% 0, ${pct}% 100%, 0 100%)`,
          transition: hinting ? 'clip-path 0.7s ease-in-out' : 'none',
        }}
      >
        <img
          src={originalUrl}
          alt="Original"
          draggable={false}
          className="absolute inset-0 z-0 h-full w-full object-contain bg-white"
          style={{ backgroundColor: '#ffffff' }}
        />
      </div>
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-[#5E2F88]/60 flex justify-center items-center -translate-x-1/2 z-20 cursor-ew-resize"
        style={{ left: `${pct}%`, transition: hinting ? 'left 0.7s ease-in-out' : 'none' }}
      >
        <div className="w-7 h-7 bg-white rounded-full shadow-lg flex items-center justify-center text-[#464646]/60 ring-2 ring-[#5E2F88]/30 pointer-events-none">
          <GripHorizontal className="w-3.5 h-3.5" />
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setLightbox('sketch'); }}
        className="absolute bottom-2 left-2 z-30 rounded-full bg-white/90 p-1.5 shadow-md transition-colors hover:bg-white"
        aria-label="הגדלת סקיצה"
      >
        <ZoomIn className="h-4 w-4 text-[#581E83]" />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setLightbox('original'); }}
        className="absolute bottom-2 right-2 z-30 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-[#581E83] shadow-md transition-colors hover:bg-white"
      >
        מקור
      </button>

      {createPortal(
        <AnimatePresence>
          {lightbox && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
              onClick={() => setLightbox(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  className="absolute -top-2 -left-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  aria-label="סגור"
                >
                  <X className="h-5 w-5" />
                </button>
                <p className="mb-2 text-center text-sm font-semibold text-white">
                  {lightbox === 'sketch' ? 'הסקיצה' : 'התמונה המקורית'}
                </p>
                <div className="overflow-hidden rounded-xl bg-white p-3 shadow-2xl sm:p-5">
                  <div className="mx-auto max-h-[80dvh] w-full bg-white" style={{ backgroundColor: '#ffffff' }}>
                    <img
                      src={lightbox === 'sketch' ? sketchUrl : originalUrl}
                      alt={lightbox === 'sketch' ? 'Sketch' : 'Original'}
                      className="mx-auto max-h-[80dvh] w-full object-contain bg-white"
                      style={{ backgroundColor: '#ffffff' }}
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export default function AISketchModal({
  isOpen,
  onClose,
  onApprove,
  onValidateImage,
  onGenerateSketch,
  onSaveApprovedSketch,
  onSubmitFeedback,
  onCheckRateLimit,
  deferSketchPersistence = false,
}) {
  // View: 'intro' | 'loading' | 'config' | 'result'
  const [view, setView] = useState('intro');
  const [step, setStep] = useState(0);

  // Image state
  const [imageFile, setImageFile] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 1, height: 1 });

  // Loading
  const [loadingTitle, setLoadingTitle] = useState('');
  const [loadingSubs, setLoadingSubs] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Config
  const [colorMode, setColorMode] = useState('auto');
  const [manualColors, setManualColors] = useState(['#000000', '#ffffff', '#ff0000']);

  // Frame + crop
  const [frameType, setFrameType] = useState('square');
  const [croppedBase64, setCroppedBase64] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [showOriginalPreview, setShowOriginalPreview] = useState(false);

  // Result
  const [sketchUrl, setSketchUrl] = useState(null);
  const [sketchWixFileUrl, setSketchWixFileUrl] = useState(null);
  const [originalMediaUrl, setOriginalMediaUrl] = useState(null);

  // Post-generation reveal sequence: 'hidden' (buffer) -> 'stars' -> 'done'
  const [revealPhase, setRevealPhase] = useState('hidden');
  const [hintTrigger, setHintTrigger] = useState(0);

  // Error
  const [error, setError] = useState(null);
  const [errorCountdown, setErrorCountdown] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const isBlockingClose = view === 'loading' || isSaving;

  useEffect(() => {
    if (!error) {
      setErrorCountdown(0);
      return undefined;
    }
    setErrorCountdown(8);
    const iv = setInterval(() => {
      setErrorCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(iv);
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [error]);

  // Sub-modals
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [retryOpen, setRetryOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState(AI_RATE_LIMIT_MESSAGE);

  // Retry form
  const [retryReason, setRetryReason] = useState('');
  const [retryText, setRetryText] = useState('');

  // Feedback form
  const [feedbackText, setFeedbackText] = useState('');

  // Attempts
  const [attempts, setAttempts] = useState(0);

  const fileInputRef = useRef(null);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setView('intro');
      setStep(0);
      setImageFile(null);
      setImageBase64(null);
      setImagePreviewUrl(null);
      setImageDimensions({ width: 1, height: 1 });
      setColorMode('auto');
      setManualColors(['#000000', '#ffffff', '#ff0000']);
      setFrameType('square');
      setCroppedBase64(null);
      setCropOpen(false);
      setShowOriginalPreview(false);
      setSketchUrl(null);
      setSketchWixFileUrl(null);
      setOriginalMediaUrl(null);
      setRevealPhase('hidden');
      setHintTrigger(0);
      setError(null);
      setIsSaving(false);
      setAttempts(0);
      setRetryReason('');
      setRetryText('');
      setFeedbackText('');
    }
  }, [isOpen]);

  const animateProgress = useCallback((durationMs = 4000) => {
    setLoadingProgress(0);
    const start = Date.now();
    const tick = durationMs >= 15000 ? 200 : Math.max(120, durationMs / 12);
    const iv = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(95, (elapsed / durationMs) * 95);
      setLoadingProgress(Math.round(pct * 10) / 10);
    }, tick);
    return () => clearInterval(iv);
  }, []);

  // Drives Phase A (5s buffer) -> Phase B (2.5s stars) -> Phase C (slider hint)
  useEffect(() => {
    if (view !== 'result' || !sketchUrl) return undefined;
    setRevealPhase('hidden');
    const tStars = setTimeout(() => {
      setRevealPhase('stars');
      setHintTrigger((k) => k + 1);
    }, RESULT_BUFFER_MS);
    const tDone = setTimeout(() => {
      setRevealPhase('done');
    }, RESULT_BUFFER_MS + STARS_DURATION_MS);
    return () => { clearTimeout(tStars); clearTimeout(tDone); };
  }, [view, sketchUrl]);

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setError(null);
    setView('loading');
    setStep(1);
    setLoadingTitle('מעלה ובודק את התמונה...');
    setLoadingSubs(LOADING_SUBTITLES_VALIDATE);
    const clearProgress = animateProgress(8000);

    try {
      if (onCheckRateLimit) {
        try {
          const rl = await onCheckRateLimit();
          if (!rl?.isAllowed) {
            clearProgress();
            setView('intro');
            setStep(0);
            setBlockedMessage(rl.reason || AI_RATE_LIMIT_MESSAGE);
            setBlockedOpen(true);
            return;
          }
        } catch (_) { /* proceed if check fails */ }
      }

      const [base64, dimensions] = await Promise.all([
        fileToBase64(file),
        getImageDimensionsFromFile(file),
      ]);
      const previewUrl = URL.createObjectURL(file);

      setImageFile(file);
      setImageBase64(base64);
      setImageDimensions(dimensions);
      setImagePreviewUrl(previewUrl);
      setCroppedBase64(null);
      setShowOriginalPreview(false);
      setAttempts(prev => prev + 1);

      setLoadingTitle('ה-AI מוודא את התמונה שלך...');
      const result = await onValidateImage(base64);
      clearProgress();
      setLoadingProgress(100);

      if (!result?.isValid) {
        if (isRateLimitResponse(result)) {
          setBlockedMessage(result.reason || AI_RATE_LIMIT_MESSAGE);
          setBlockedOpen(true);
        } else {
          setError(result?.reason || 'התמונה לא מתאימה לטאפטינג. נסו תמונה אחרת.');
        }
        setView('intro');
        setStep(0);
        return;
      }

      setTimeout(() => {
        setView('config');
        setStep(1);
      }, 400);
    } catch (err) {
      clearProgress();
      const msg = err?.message || '';
      if (msg.includes('מגבלת') && msg.includes('ניסיונות')) {
        setBlockedMessage(msg);
        setBlockedOpen(true);
      } else {
        setError(msg || 'שגיאה בבדיקת התמונה. נסו שוב.');
      }
      setView('intro');
      setStep(0);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onValidateImage, onCheckRateLimit, animateProgress]);

  const handleStartConversion = useCallback(async () => {
    setView('loading');
    setStep(2);
    setLoadingTitle('הופך לסקיצה...');
    setLoadingSubs(LOADING_SUBTITLES_GENERATE);
    const clearProgress = animateProgress(SKETCH_PROGRESS_DURATION_MS);

    try {
      // Cropped image (custom shape) becomes the focused AI input when present
      const inputBase64 = croppedBase64 || imageBase64;
      const result = await onGenerateSketch(inputBase64, 'AUTO', imageDimensions);
      clearProgress();
      setLoadingProgress(100);

      if (!result?.sketchUrl) {
        throw new Error('לא התקבלה סקיצה מהשרת');
      }

      setSketchUrl(result.sketchUrl);
      setSketchWixFileUrl(result.sketchWixFileUrl || null);
      if (result.originalUrl) setOriginalMediaUrl(result.originalUrl);

      setTimeout(() => {
        setView('result');
        setStep(2);
      }, 400);
    } catch (err) {
      clearProgress();
      console.error('[AISketchModal] generateSketch failed:', err);
      const msg = err?.message || '';
      if (msg.includes('מגבלת') && msg.includes('ניסיונות')) {
        setBlockedMessage(msg);
        setBlockedOpen(true);
      } else {
        setError('שגיאה ביצירת הסקיצה. נסו שוב.');
      }
      setView('config');
      setStep(1);
    }
  }, [imageBase64, croppedBase64, imageDimensions, onGenerateSketch, animateProgress]);

  const imageAspectRatio = imageDimensions.width / imageDimensions.height;

  // Compare slider "מקור" = cropped input when user cropped, else uploaded preview
  const compareOriginalUrl = croppedBase64 || originalMediaUrl || imagePreviewUrl;

  const handleApprove = useCallback(async () => {
    setError(null);
    if (isSaving) return;
    setIsSaving(true);

    try {
      if (!onSaveApprovedSketch) {
        throw new Error('שגיאה בשמירת הסקיצה. נסו שוב.');
      }

      const originalInput = originalMediaUrl || imageBase64;
      const sketchInputForSave = sketchWixFileUrl || sketchUrl;
      const saved = await onSaveApprovedSketch(originalInput, sketchInputForSave, 'AUTO', croppedBase64);

      onApprove({
        source: 'ai',
        productId: null,
        title: 'עיצוב מותאם אישית (AI)',
        image: saved?.sketchUrl || sketchUrl,
        wixFileUrl: saved?.wixFileUrl || null,
        aiOriginalImage: saved?.originalUrl || originalMediaUrl || imageBase64,
        aiColors: saved?.colors || 'AUTO',
        aiTaskId: saved?.taskId || null,
        canvasSize: '60x60',
        frameType,
        aiCroppedImage: saved?.croppedUrl || null,
        pendingMediaUpload: false,
      });
      onClose();
    } catch (err) {
      console.error('[AISketchModal] save approved sketch failed:', err);
      setError('שגיאה בשמירת הסקיצה. נסו שוב.');
    } finally {
      setIsSaving(false);
    }
  }, [imageBase64, croppedBase64, frameType, originalMediaUrl, sketchUrl, sketchWixFileUrl, onApprove, onClose, onSaveApprovedSketch, isSaving]);

  const handleRetrySubmit = useCallback(async () => {
    if (!retryReason) return;

    const reasonText = retryReason === 'other' ? retryText.trim() : retryReason;
    if (retryReason === 'other' && !reasonText) return;

    if (attempts >= MAX_ATTEMPTS) {
      setRetryOpen(false);
      setBlockedMessage(AI_RATE_LIMIT_MESSAGE);
      setBlockedOpen(true);
      return;
    }

    if (onSubmitFeedback) {
      try { await onSubmitFeedback(reasonText, 'Retry'); } catch (_) {}
    }

    setRetryOpen(false);
    setRetryReason('');
    setRetryText('');
    setAttempts(prev => prev + 1);
    handleStartConversion();
  }, [retryReason, retryText, attempts, onSubmitFeedback, handleStartConversion]);

  const handleFeedbackSubmit = useCallback(async () => {
    if (!feedbackText.trim()) return;
    if (onSubmitFeedback) {
      try { await onSubmitFeedback(feedbackText, 'Global'); } catch (_) {}
    }
    setFeedbackOpen(false);
    setFeedbackText('');
  }, [feedbackText, onSubmitFeedback]);

  const addColor = () => {
    if (manualColors.length < 6) setManualColors(prev => [...prev, '#cccccc']);
  };

  const removeColor = (idx) => {
    if (manualColors.length > 3) setManualColors(prev => prev.filter((_, i) => i !== idx));
  };

  const updateColor = (idx, val) => {
    setManualColors(prev => prev.map((c, i) => i === idx ? val : c));
  };

  const difficultyInfo = (() => {
    const n = manualColors.length;
    if (n <= 3) return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'רמת קושי: קלה', desc: '3 צבעים זה מעולה ומהיר!' };
    if (n === 4) return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'רמת קושי: קל-בינוני', desc: 'ייקח מעט יותר זמן, אבל לגמרי אפשרי.' };
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: `רמת קושי: קשה (${n} צבעים)`, desc: 'זמן הצביעה עולה. ייתכן ותצטרכו לרכוש מפגש המשך.' };
  })();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92dvh] overflow-y-auto relative"
          dir="rtl"
        >
          {/* Close (top-right) + Feedback (top-left) */}
          <div className="absolute top-3 right-3 z-20">
            {!isBlockingClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#464646] hover:bg-[#e8e8e8] transition-colors"
                aria-label="סגור"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {!isBlockingClose && (
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="absolute top-3 left-3 z-20 bg-[#f5f0fa] text-[#5E2F88] px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 text-[12px] font-bold hover:bg-[#ebe0f5] transition-colors ring-1 ring-[#5E2F88]/15"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">פידבק</span>
          </button>
          )}

          {/* Header */}
          <div className="bg-[#f5f0fa] pt-12 pb-5 px-6 text-center border-b border-[#5E2F88]/10">
            <h1 className="text-xl md:text-2xl font-bold text-[#581E83] mb-1">עיצוב מותאם אישית בעזרת AI</h1>
          </div>

          {/* Stepper */}
          <Stepper step={step} />

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            onChange={handleFileUpload}
          />

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-6 mt-3"
              >
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 flex-1">{error}</p>
                  {errorCountdown > 0 && (
                    <span className="text-xs text-red-500 font-medium tabular-nums shrink-0 mt-0.5">
                      {errorCountdown}s
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content area */}
          <div className="p-5 md:p-6 min-h-[350px]">

            {/* ---- VIEW: INTRO ---- */}
            {view === 'intro' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* Steps explanation */}
                <div className="bg-[#fafafa] rounded-xl p-4 space-y-3.5 border border-[#e8e8e8]">
                  {[
                    { n: 1, title: 'מעלים תמונה', desc: 'בחרו תמונה ברורה, באיכות טובה, שאינה עמוסה בפרטים קטנים או צלליות מורכבות.' },
                    { n: 2, title: 'ה-AI שלנו בודק', desc: 'המערכת תוודא שהתמונה מתאימה לתפירה בטאפטינג ותתאים אותה.' },
                    { n: 3, title: 'המרה לסקיצה', desc: 'מאשרים את התמונה ומקבלים סקיצה בשחור-לבן מוכנה לתפירה!' },
                  ].map(({ n, title, desc }) => (
                    <div key={n} className="flex items-start gap-3">
                      <div className="bg-[#f5f0fa] text-[#5E2F88] rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm shrink-0">{n}</div>
                      <div>
                        <h3 className="font-bold text-[#464646] text-[14px]">{title}</h3>
                        <p className="text-[13px] text-[#464646]/60 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setExamplesOpen(true)}
                    className="text-[#5E2F88] text-[13px] font-semibold hover:underline flex items-center gap-1 mr-10"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> צפו בדוגמאות לתמונות טובות
                  </button>
                </div>

                {/* Upload area */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#5E2F88]/40 rounded-2xl p-8 text-center hover:bg-[#f5f0fa] transition-colors cursor-pointer group"
                >
                  <Upload className="w-10 h-10 text-[#5E2F88] mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <h3 className="text-[15px] font-bold text-[#464646]">לחצו כאן להעלאת תמונה</h3>
                  <p className="text-[13px] text-[#464646]/50 mt-1">JPG, PNG, WEBP (עד 5MB)</p>
                </button>
              </motion.div>
            )}

            {/* ---- VIEW: LOADING ---- */}
            {view === 'loading' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <LoadingView
                  title={loadingTitle}
                  subtitles={loadingSubs}
                  progress={loadingProgress}
                />
              </motion.div>
            )}

            {/* ---- VIEW: CONFIG ---- */}
            {view === 'config' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <div className="text-center mb-2">
                  <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full text-[12px] font-bold mb-2">
                    <Check className="w-3.5 h-3.5" /> התמונה אושרה!
                  </div>
                  <h2 className="text-xl font-bold text-[#581E83]">אישור והמרה</h2>
                  <p className="text-[#464646]/60 text-sm">הסקיצה תיווצר בשחור-לבן, מוכנה לתפירה</p>
                </div>

                <div className="flex flex-col md:flex-row gap-5 items-start">
                  {/* Image preview */}
                  <div className="w-full md:w-1/2 flex flex-col items-center">
                    <div
                      className="relative w-full rounded-xl overflow-hidden shadow-sm border border-[#e8e8e8] bg-white flex items-center justify-center mx-auto"
                      style={getImageFrameStyle(imageAspectRatio, 240)}
                    >
                      {imagePreviewUrl && (
                        <img
                          src={(croppedBase64 && !showOriginalPreview) ? croppedBase64 : imagePreviewUrl}
                          alt="Preview"
                          className="w-full h-full object-contain bg-white"
                        />
                      )}
                      {croppedBase64 && (
                        <span className="absolute top-2 right-2 bg-[#5E2F88] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          {showOriginalPreview ? 'תמונה מקורית' : 'תמונה חתוכה'}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[13px] font-semibold text-[#464646]/60 hover:text-[#5E2F88] transition-colors flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-[#e8e8e8] shadow-sm hover:border-[#5E2F88]/30"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> החלפת תמונה
                      </button>
                      {croppedBase64 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowOriginalPreview((v) => !v)}
                            className="text-[13px] font-semibold text-[#464646]/60 hover:text-[#5E2F88] transition-colors flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-[#e8e8e8] shadow-sm hover:border-[#5E2F88]/30"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            {showOriginalPreview ? 'הצגת החיתוך' : 'הצגת המקור'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setCroppedBase64(null); setShowOriginalPreview(false); }}
                            className="text-[13px] font-semibold text-red-500/80 hover:text-red-600 transition-colors flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-red-200 shadow-sm"
                          >
                            <X className="w-3.5 h-3.5" /> ביטול החיתוך
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="w-full md:w-1/2 space-y-3.5">
                    {/* Frame selection */}
                    <div>
                      <h3 className="text-[13px] font-bold text-[#464646] mb-2">בחירת מסגרת לשטיח:</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {FRAME_OPTIONS.map(({ id, label, Icon }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setFrameType(id);
                              if (id === 'custom') setCropOpen(true);
                            }}
                            className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border-2 transition-all ${
                              frameType === id
                                ? 'border-[#5E2F88] bg-[#f5f0fa] text-[#5E2F88]'
                                : 'border-[#e8e8e8] bg-white text-[#464646]/60 hover:border-[#5E2F88]/30'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-[12px] font-semibold">{label}</span>
                          </button>
                        ))}
                      </div>
                      {frameType === 'custom' && (
                        <button
                          type="button"
                          onClick={() => setCropOpen(true)}
                          className="mt-2 w-full text-[13px] font-semibold text-[#5E2F88] flex items-center justify-center gap-1.5 bg-white px-3 py-2 rounded-lg border border-[#5E2F88]/30 shadow-sm hover:bg-[#f5f0fa] transition-colors"
                        >
                          <CropIcon className="w-3.5 h-3.5" />
                          {croppedBase64 ? 'חיתוך מחדש' : 'חיתוך התמונה'}
                        </button>
                      )}
                    </div>

                    <div className="bg-blue-50 text-blue-800 p-2.5 rounded-xl text-[13px] border border-blue-100 flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 opacity-70 shrink-0" />
                      <span>המערכת תהפוך את התמונה לסקיצת קווים בשחור-לבן, תסיר את הרקע ותפשט את הפרטים.</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartConversion}
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:scale-[1.02] transition-all flex justify-center items-center gap-2"
                    >
                      <span>יצירת סקיצה</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ---- VIEW: RESULT ---- */}
            {view === 'result' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-5"
              >
                <div className="relative">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 flex gap-1 pointer-events-none">
                    {[...Array(5)].map((_, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 8, scale: 0.5 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.15 * i, type: 'spring', stiffness: 200 }}
                      >
                        <Sparkles className="w-4 h-4 text-[#5E2F88]" />
                      </motion.span>
                    ))}
                  </div>
                  <h2 className="text-xl font-bold text-[#581E83] mb-1">הסקיצה שלך מוכנה!</h2>
                  <p className="text-[#464646]/60 text-sm">ככה בערך יראה השטיח שלכם. מוכנים להתחיל לתפור?</p>
                </div>

                {/* Compare slider */}
                <div className="relative w-full max-w-md mx-auto">
                  <CompareSlider
                    originalUrl={compareOriginalUrl}
                    sketchUrl={sketchUrl}
                    aspectRatio={imageAspectRatio}
                    hintTrigger={hintTrigger}
                  />

                  {/* Phase A: pre-load buffer overlay (image is in DOM but hidden) */}
                  {revealPhase === 'hidden' && (
                    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 rounded-2xl border-4 border-white bg-white">
                      <Loader2 className="w-10 h-10 text-[#5E2F88] animate-spin" />
                      <p className="text-sm font-semibold text-[#5E2F88]">מכין את הסקיצה שלך...</p>
                    </div>
                  )}

                  {/* Phase B: success stars animation */}
                  {revealPhase === 'stars' && <StarsBurst />}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isSaving}
                    className={`bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-5 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 flex-1 min-w-[140px] ${isSaving ? 'opacity-80 cursor-wait' : ''}`}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {isSaving ? 'שומר...' : (deferSketchPersistence ? 'אישור והמשך' : 'אישור ושמירה')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRetryOpen(true)}
                    disabled={isSaving}
                    className="bg-white border-2 border-[#e8e8e8] hover:border-[#464646]/30 text-[#464646] font-bold py-3 px-5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 flex-1 min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-4 h-4" /> ניסיון נוסף
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSaving}
                    className="bg-[#f5f5f5] hover:bg-[#e8e8e8] text-[#464646] font-bold py-3 px-5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 flex-1 min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ImageIcon className="w-4 h-4" /> החלפת תמונה
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ====== SUB-MODALS ====== */}

      {/* Examples modal */}
      {examplesOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setExamplesOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center bg-[#fafafa]">
              <h3 className="font-bold text-[15px] text-[#581E83]">דוגמאות לתמונות</h3>
              <button type="button" onClick={() => setExamplesOpen(false)} className="text-[#464646]/50 hover:text-[#464646]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Good */}
                <div className="flex-1 border rounded-xl overflow-hidden">
                  <div className="relative">
                    <span className="absolute top-2 right-2 bg-green-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full z-10 flex items-center gap-1">
                      <Check className="w-3 h-3" /> תמונה טובה
                    </span>
                    <div className="h-36 bg-gradient-to-br from-[#f5f0fa] to-[#E4C1F9] flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-[#5E2F88]/40" />
                    </div>
                  </div>
                  <div className="p-3 text-[13px]">
                    <ul className="text-[#464646]/70 space-y-1 list-disc list-inside">
                      <li>קווים ברורים</li>
                      <li>נושא ברור במרכז</li>
                      <li>ללא רקע עמוס</li>
                    </ul>
                  </div>
                </div>
                {/* Bad */}
                <div className="flex-1 border rounded-xl overflow-hidden">
                  <div className="relative">
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full z-10 flex items-center gap-1">
                      <X className="w-3 h-3" /> לא מתאימה
                    </span>
                    <div className="h-36 bg-gradient-to-br from-[#e8e8e8] to-[#c4c4c4] flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-[#464646]/30" />
                    </div>
                  </div>
                  <div className="p-3 text-[13px]">
                    <ul className="text-[#464646]/70 space-y-1 list-disc list-inside">
                      <li>תמונה ריאליסטית מדי</li>
                      <li>הצללות ואלפי גוונים</li>
                      <li>פרטים קטנים מאוד</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Retry modal */}
      {retryOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setRetryOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl relative"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={() => setRetryOpen(false)} className="absolute top-3 left-3 text-[#464646]/40 hover:text-[#464646]">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-lg text-[#581E83] mb-1.5">משהו לא הסתדר?</h3>
            <p className="text-[#464646]/60 text-sm mb-3">ספרו לנו למה תרצו לנסות שוב:</p>

            <select
              value={retryReason}
              onChange={(e) => setRetryReason(e.target.value)}
              className="w-full border border-[#e8e8e8] rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#5E2F88] outline-none mb-3 bg-white cursor-pointer"
            >
              <option value="" disabled>בחרו סיבה...</option>
              <option value="הסקיצה עמוסה מדי בפרטים">הסקיצה עמוסה מדי בפרטים</option>
              <option value="הרקע לא הוסר כראוי">הרקע לא הוסר כראוי</option>
              <option value="חסרים פרטים חשובים">חסרים פרטים חשובים בפנים/רקע</option>
              <option value="הקווים לא מספיק ברורים">הקווים לא מספיק ברורים</option>
              <option value="other">אחר (פירוט חופשי)</option>
            </select>

            {retryReason === 'other' && (
              <div className="mb-3">
                <textarea
                  value={retryText}
                  onChange={(e) => setRetryText(e.target.value)}
                  className="w-full border border-[#e8e8e8] rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#5E2F88] outline-none resize-none h-20"
                  placeholder="פרטו כאן (עד 200 תווים)..."
                  maxLength={200}
                />
                <div className="text-left text-[11px] text-[#464646]/40">{retryText.length} / 200</div>
              </div>
            )}

            <button
              type="button"
              onClick={handleRetrySubmit}
              disabled={!retryReason || (retryReason === 'other' && !retryText.trim())}
              className="w-full bg-[#5E2F88] hover:bg-[#7B3DB0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition-colors"
            >
              שליחה וניסיון נוסף
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Global feedback modal */}
      {feedbackOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setFeedbackOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl relative"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={() => setFeedbackOpen(false)} className="absolute top-3 left-3 text-[#464646]/40 hover:text-[#464646]">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-lg text-[#581E83] mb-1.5">יש לכם הערה או הצעה?</h3>
            <p className="text-[#464646]/60 text-sm mb-3">הפיידבק שלכם חשוב לנו ויעזור לנו להשתפר!</p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="w-full border border-[#e8e8e8] rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#5E2F88] outline-none resize-none h-28 mb-3"
              placeholder="שתפו אותנו במחשבות שלכם..."
            />
            <button
              type="button"
              onClick={handleFeedbackSubmit}
              disabled={!feedbackText.trim()}
              className="w-full bg-[#464646] hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition-colors"
            >
              שלח פידבק
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Crop modal (custom shape frame) */}
      <ImageCropModal
        isOpen={cropOpen}
        imageUrl={imagePreviewUrl}
        onCancel={() => setCropOpen(false)}
        onConfirm={(base64) => {
          setCroppedBase64(base64);
          setShowOriginalPreview(false);
          setCropOpen(false);
        }}
      />

      {/* Blocked (rate limit) modal */}
      {blockedOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setBlockedOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl w-full max-w-xs p-6 shadow-2xl text-center border-t-4 border-red-500"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-lg text-[#581E83] mb-1.5">הגעתם למגבלת הניסיונות</h3>
            <p className="text-[#464646]/60 text-sm mb-5">
              {blockedMessage}
            </p>
            <button
              type="button"
              onClick={() => setBlockedOpen(false)}
              className="w-full bg-[#e8e8e8] hover:bg-[#d5d5d5] text-[#464646] font-bold py-2.5 rounded-xl transition-colors"
            >
              הבנתי
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
