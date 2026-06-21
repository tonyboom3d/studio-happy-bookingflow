import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, Loader2, Check, ChevronLeft, ChevronRight,
  RotateCcw, Image as ImageIcon, Info, AlertTriangle, MessageSquare,
  Sparkles, Star, GripHorizontal, Plus, Trash2, ZoomIn,
} from 'lucide-react';

const STEPS = ['העלאה', 'הגדרות', 'סקיצה'];
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
  'מתאים את הפלטה שבחרת...',
  'מכין קובץ סופי...',
];

const LOADING_SUBTITLES_SAVE = [
  'מעלה את התמונות לשרת...',
  'שומר את הסקיצה...',
  'מכין לקישור להזמנה...',
];

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

function CompareSlider({ originalUrl, sketchUrl, aspectRatio = 1 }) {
  const containerRef = useRef(null);
  const [pct, setPct] = useState(50);
  const dragging = useRef(false);
  const [animated, setAnimated] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const frameStyle = getImageFrameStyle(aspectRatio, 360);

  const update = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    let p = ((clientX - rect.left) / rect.width) * 100;
    p = Math.max(0, Math.min(100, p));
    setPct(p);
  }, []);

  const startDrag = useCallback((e) => {
    dragging.current = true;
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

  useEffect(() => {
    if (animated) return;
    setAnimated(true);
    setPct(50);
    const t1 = setTimeout(() => setPct(90), 300);
    const t2 = setTimeout(() => setPct(15), 1000);
    const t3 = setTimeout(() => setPct(50), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl shadow-xl border-4 border-white select-none overflow-hidden touch-none bg-white mx-auto"
      style={frameStyle}
      onMouseDown={startDrag}
      onTouchStart={startDrag}
    >
      <img src={sketchUrl} alt="Sketch" draggable={false} className="absolute inset-0 w-full h-full object-contain bg-white" />
      <img
        src={originalUrl}
        alt="Original"
        draggable={false}
        className="absolute inset-0 w-full h-full object-contain bg-white"
        style={{ clipPath: `polygon(0 0, ${pct}% 0, ${pct}% 100%, 0 100%)` }}
      />
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-[#5E2F88]/60 flex justify-center items-center -translate-x-1/2 z-20 cursor-ew-resize"
        style={{ left: `${pct}%` }}
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

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
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
                <img
                  src={lightbox === 'sketch' ? sketchUrl : originalUrl}
                  alt={lightbox === 'sketch' ? 'Sketch' : 'Original'}
                  className="mx-auto max-h-[80dvh] w-full object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

  // Result
  const [sketchUrl, setSketchUrl] = useState(null);
  const [originalMediaUrl, setOriginalMediaUrl] = useState(null);

  // Error
  const [error, setError] = useState(null);
  const [errorCountdown, setErrorCountdown] = useState(0);

  const isBlockingClose = view === 'loading';

  useEffect(() => {
    if (!error) {
      setErrorCountdown(0);
      return undefined;
    }
    setErrorCountdown(6);
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
      setSketchUrl(null);
      setOriginalMediaUrl(null);
      setError(null);
      setAttempts(0);
      setRetryReason('');
      setRetryText('');
      setFeedbackText('');
    }
  }, [isOpen]);

  const animateProgress = useCallback((durationMs = 4000) => {
    setLoadingProgress(0);
    let progress = 0;
    const iv = setInterval(() => {
      progress += Math.random() * 12;
      if (progress > 90) progress = 90;
      setLoadingProgress(Math.round(progress));
    }, durationMs / 10);
    return () => clearInterval(iv);
  }, []);

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
      setAttempts(prev => prev + 1);

      setLoadingTitle('ה-AI מוודא את התמונה שלך...');
      const result = await onValidateImage(base64);
      clearProgress();
      setLoadingProgress(100);

      if (!result?.isValid) {
        setError(result?.reason || 'התמונה לא מתאימה לטאפטינג. נסו תמונה אחרת.');
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
      setError(err?.message || 'שגיאה בבדיקת התמונה. נסו שוב.');
      setView('intro');
      setStep(0);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onValidateImage, onCheckRateLimit, animateProgress]);

  const handleStartConversion = useCallback(async () => {
    const palette = colorMode === 'auto' ? 'AUTO' : manualColors;

    setView('loading');
    setStep(2);
    setLoadingTitle('הופך לסקיצה...');
    setLoadingSubs(LOADING_SUBTITLES_GENERATE);
    const clearProgress = animateProgress(8000);

    try {
      const result = await onGenerateSketch(imageBase64, palette, imageDimensions);
      clearProgress();
      setLoadingProgress(100);

      if (!result?.sketchUrl) {
        throw new Error('לא התקבלה סקיצה מהשרת');
      }

      setSketchUrl(result.sketchUrl);
      if (result.originalUrl) setOriginalMediaUrl(result.originalUrl);

      setTimeout(() => {
        setView('result');
        setStep(2);
      }, 400);
    } catch (err) {
      clearProgress();
      console.error('[AISketchModal] generateSketch failed:', err);
      setError('שגיאה ביצירת הסקיצה. נסו שוב.');
      setView('config');
      setStep(1);
    }
  }, [colorMode, manualColors, imageBase64, imageDimensions, onGenerateSketch, animateProgress]);

  const imageAspectRatio = imageDimensions.width / imageDimensions.height;

  const handleApprove = useCallback(async () => {
    setError(null);
    setView('loading');
    setStep(2);
    setLoadingTitle('שומר את הסקיצה...');
    setLoadingSubs(LOADING_SUBTITLES_SAVE);
    setLoadingProgress(0);
    const clearProgress = animateProgress(5000);

    try {
      let finalImage = sketchUrl;
      let aiOriginalImage = null;
      let aiColors = colorMode === 'auto' ? 'AUTO' : manualColors;
      let aiTaskId = null;

      if (onSaveApprovedSketch) {
        const originalInput = originalMediaUrl || imageBase64;
        const colors = colorMode === 'auto' ? 'AUTO' : manualColors;
        const saved = await onSaveApprovedSketch(originalInput, sketchUrl, colors);
        if (saved?.sketchUrl) finalImage = saved.sketchUrl;
        if (saved?.originalUrl) aiOriginalImage = saved.originalUrl;
        if (saved?.colors) aiColors = saved.colors;
        if (saved?.taskId) aiTaskId = saved.taskId;
      }

      onApprove({
        source: 'ai',
        productId: null,
        title: 'עיצוב מותאם אישית (AI)',
        image: finalImage,
        aiOriginalImage,
        aiColors,
        aiTaskId,
        canvasSize: '60x60',
      });

      clearProgress();
      setLoadingProgress(100);
      onClose();
    } catch (err) {
      clearProgress();
      console.error('[AISketchModal] save approved sketch failed:', err);
      setError('שגיאה בשמירת הסקיצה. נסו שוב.');
      setView('result');
      setStep(2);
    }
  }, [imageBase64, originalMediaUrl, sketchUrl, colorMode, manualColors, onApprove, onClose, onSaveApprovedSketch, animateProgress]);

  const handleRetrySubmit = useCallback(async () => {
    if (!retryReason) return;

    const reasonText = retryReason === 'other' ? retryText.trim() : retryReason;
    if (retryReason === 'other' && !reasonText) return;

    if (attempts >= MAX_ATTEMPTS) {
      setRetryOpen(false);
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

  const handleBackdropClick = isBlockingClose ? undefined : onClose;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"
        onClick={handleBackdropClick}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92dvh] overflow-y-auto relative"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close + Feedback buttons */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
            {!isBlockingClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#464646] hover:bg-[#e8e8e8] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {!isBlockingClose && (
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="absolute top-3 right-3 z-20 bg-[#f5f0fa] text-[#5E2F88] px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 text-[12px] font-bold hover:bg-[#ebe0f5] transition-colors ring-1 ring-[#5E2F88]/15"
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
                    { n: 3, title: 'בחירת צבעים והמרה', desc: 'מאשרים את התמונה, בוחרים צבעים — ומקבלים סקיצה מוכנה!' },
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
                  <h2 className="text-xl font-bold text-[#581E83]">הגדרות צבעים</h2>
                  <p className="text-[#464646]/60 text-sm">בחרו את פלטת הצבעים לסקיצה שלכם</p>
                </div>

                <div className="flex flex-col md:flex-row gap-5 items-start">
                  {/* Image preview */}
                  <div className="w-full md:w-1/2 flex flex-col items-center">
                    <div
                      className="w-full rounded-xl overflow-hidden shadow-sm border border-[#e8e8e8] bg-white flex items-center justify-center mx-auto"
                      style={getImageFrameStyle(imageAspectRatio, 240)}
                    >
                      {imagePreviewUrl && (
                        <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-contain" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 text-[13px] font-semibold text-[#464646]/60 hover:text-[#5E2F88] transition-colors flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-[#e8e8e8] shadow-sm hover:border-[#5E2F88]/30"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> החלפת תמונה
                    </button>
                  </div>

                  {/* Controls */}
                  <div className="w-full md:w-1/2 space-y-3.5">
                    {/* Color mode toggle */}
                    <div className="bg-[#f5f5f5] p-1 rounded-lg flex text-[13px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setColorMode('auto')}
                        className={`flex-1 py-2 rounded-md transition-all ${
                          colorMode === 'auto' ? 'bg-white shadow-sm text-[#5E2F88]' : 'text-[#464646]/50 hover:text-[#464646]/70'
                        }`}
                      >
                        מהתמונה
                      </button>
                      <button
                        type="button"
                        onClick={() => setColorMode('manual')}
                        className={`flex-1 py-2 rounded-md transition-all ${
                          colorMode === 'manual' ? 'bg-white shadow-sm text-[#5E2F88]' : 'text-[#464646]/50 hover:text-[#464646]/70'
                        }`}
                      >
                        בחירה ידנית
                      </button>
                    </div>

                    {/* Explanation */}
                    <div className="bg-blue-50 text-blue-800 p-2.5 rounded-xl text-[13px] border border-blue-100 flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 opacity-70 shrink-0" />
                      <span>{colorMode === 'auto'
                        ? 'המערכת תבחר אוטומטית את הגוונים הבולטים והמדויקים מהתמונה.'
                        : 'הרכיבו בעצמכם את פלטת הצבעים הרצויה עבור הסקיצה.'
                      }</span>
                    </div>

                    {/* Manual color picker */}
                    <AnimatePresence>
                      {colorMode === 'manual' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 overflow-hidden"
                        >
                          <div>
                            <label className="text-[13px] font-bold text-[#464646]">בחרו 3 עד 6 צבעים:</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {manualColors.map((color, idx) => (
                                <div key={idx} className="relative w-9 h-9 rounded-full border border-[#e8e8e8] shadow-sm overflow-hidden shrink-0 cursor-pointer group">
                                  <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => updateColor(idx, e.target.value)}
                                    className="absolute inset-0 w-[150%] h-[150%] -top-1 -left-1 cursor-pointer"
                                  />
                                  {manualColors.length > 3 && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); removeColor(idx); }}
                                      className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {manualColors.length < 6 && (
                                <button
                                  type="button"
                                  onClick={addColor}
                                  className="w-9 h-9 rounded-full border-2 border-dashed border-[#464646]/30 flex items-center justify-center text-[#464646]/30 hover:border-[#5E2F88] hover:text-[#5E2F88] transition-colors"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Difficulty alert */}
                          <div className={`p-2.5 rounded-lg text-[13px] flex items-start gap-2 ${difficultyInfo.bg} ${difficultyInfo.text} border ${difficultyInfo.border}`}>
                            <Info className="w-4 h-4 mt-0.5 shrink-0" />
                            <div>
                              <strong className="block">{difficultyInfo.label}</strong>
                              <span className="opacity-90">{difficultyInfo.desc}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <button
                      type="button"
                      onClick={handleStartConversion}
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:scale-[1.02] transition-all flex justify-center items-center gap-2"
                    >
                      <span>אישור והמשך</span>
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
                <div>
                  <h2 className="text-xl font-bold text-[#581E83] mb-1">הסקיצה שלך מוכנה!</h2>
                  <p className="text-[#464646]/60 text-sm">ככה בערך יראה השטיח שלכם. מוכנים להתחיל לתפור?</p>
                </div>

                {/* Compare slider */}
                <div className="relative w-full max-w-md mx-auto">
                  <CompareSlider
                    originalUrl={imagePreviewUrl}
                    sketchUrl={sketchUrl}
                    aspectRatio={imageAspectRatio}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                  <button
                    type="button"
                    onClick={handleApprove}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-5 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 flex-1 min-w-[140px]"
                  >
                    <Check className="w-4 h-4" /> אישור ושמירה
                  </button>
                  <button
                    type="button"
                    onClick={() => setRetryOpen(true)}
                    className="bg-white border-2 border-[#e8e8e8] hover:border-[#464646]/30 text-[#464646] font-bold py-3 px-5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 flex-1 min-w-[140px]"
                  >
                    <RotateCcw className="w-4 h-4" /> ניסיון נוסף
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#f5f5f5] hover:bg-[#e8e8e8] text-[#464646] font-bold py-3 px-5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 flex-1 min-w-[140px]"
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
                      <li>מעט צבעים (עד 5)</li>
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
              <option value="הצבעים לא מתאימים לתמונה">הצבעים לא מתאימים לתמונה</option>
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
              זיהינו מספר רב של ניסיונות ({MAX_ATTEMPTS}) בזמן קצר. המערכת הוקפאה זמנית. אנא נסו שוב מאוחר יותר.
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
