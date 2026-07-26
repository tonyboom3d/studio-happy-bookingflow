import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Crop as CropIcon, Loader2 } from 'lucide-react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const MAX_OUTPUT_DIMENSION = 2048;

function getCroppedBase64(imageEl, crop) {
  const scaleX = imageEl.naturalWidth / imageEl.width;
  const scaleY = imageEl.naturalHeight / imageEl.height;

  let outWidth = Math.round(crop.width * scaleX);
  let outHeight = Math.round(crop.height * scaleY);
  if (outWidth < 1 || outHeight < 1) return null;

  // Cap output size so the base64 payload stays postMessage-friendly
  const scaleDown = Math.min(1, MAX_OUTPUT_DIMENSION / Math.max(outWidth, outHeight));
  outWidth = Math.round(outWidth * scaleDown);
  outHeight = Math.round(outHeight * scaleDown);

  const canvas = document.createElement('canvas');
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outWidth, outHeight);
  ctx.drawImage(
    imageEl,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    outWidth,
    outHeight,
  );
  return canvas.toDataURL('image/png');
}

/**
 * Free-form rectangular crop modal for the "custom shape" frame option.
 * Returns a white-flattened PNG base64 via onConfirm.
 */
export default function ImageCropModal({ isOpen, imageUrl, onCancel, onConfirm }) {
  const [crop, setCrop] = useState(null);
  const [completedCrop, setCompletedCrop] = useState(null);
  const [processing, setProcessing] = useState(false);
  const imgRef = useRef(null);

  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget;
    const initial = centerCrop(
      makeAspectCrop({ unit: '%', width: 80 }, width / height, width, height),
      width,
      height,
    );
    setCrop(initial);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!imgRef.current || !completedCrop?.width || !completedCrop?.height) return;
    setProcessing(true);
    try {
      const base64 = getCroppedBase64(imgRef.current, completedCrop);
      if (base64) onConfirm(base64);
      else onCancel();
    } finally {
      setProcessing(false);
    }
  }, [completedCrop, onConfirm, onCancel]);

  if (!isOpen || !imageUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b bg-[#fafafa] flex justify-between items-center">
          <h3 className="font-bold text-[15px] text-[#581E83] flex items-center gap-2">
            <CropIcon className="w-4 h-4" /> חיתוך התמונה
          </h3>
          <button type="button" onClick={onCancel} className="text-[#464646]/50 hover:text-[#464646]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-[13px] text-[#464646]/60 mb-3 text-center">
            גררו את המסגרת כדי למקד את האזור שיהפוך לסקיצה
          </p>
          <div className="flex justify-center bg-[#f5f5f5] rounded-xl p-2 max-h-[55dvh] overflow-hidden">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              keepSelection
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Crop"
                onLoad={onImageLoad}
                style={{ maxHeight: '50dvh', maxWidth: '100%' }}
              />
            </ReactCrop>
          </div>
        </div>

        <div className="p-4 pt-0 flex gap-2.5">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={processing || !completedCrop?.width}
            className="flex-1 bg-[#5E2F88] hover:bg-[#7B3DB0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            אישור חיתוך
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-[#f5f5f5] hover:bg-[#e8e8e8] text-[#464646] font-bold py-2.5 rounded-xl transition-colors"
          >
            ביטול
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
