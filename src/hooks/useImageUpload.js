// src/hooks/useImageUpload.js
import { useState, useCallback } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_RAW_SIZE  = 5 * 1024 * 1024; // 5 MB
const MAX_DIMENSION = 900;             // px — max side after resize
const OUTPUT_QUALITY = 0.82;           // JPEG output quality

/**
 * Compresses an image File using the Canvas API.
 * Maintains aspect ratio. Always outputs as JPEG.
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Scale down proportionally if needed
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      // White background for transparent PNGs
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('No se pudo comprimir la imagen.'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        OUTPUT_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer el archivo de imagen.'));
    };

    img.src = objectUrl;
  });
}

/**
 * useImageUpload
 *
 * Handles validation → compression → Firebase Storage upload for product images.
 *
 * Returns:
 *   uploading  {boolean}  — true while upload is in progress
 *   progress   {number}   — 0–100 upload percentage
 *   error      {string|null}
 *   uploadImage(file) → Promise<string>  — resolves with public download URL
 *   reset()    — clears state
 */
export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState(null);

  const uploadImage = useCallback(async (file) => {
    setError(null);

    // ── 1. Validate type ──────────────────────────────────────
    if (!ALLOWED_TYPES.includes(file.type)) {
      const msg = 'Formato no válido. Usa JPG, PNG o WebP.';
      setError(msg);
      throw new Error(msg);
    }

    // ── 2. Validate raw size ──────────────────────────────────
    if (file.size > MAX_RAW_SIZE) {
      const mb  = (file.size / 1024 / 1024).toFixed(1);
      const msg = `El archivo pesa ${mb} MB. El máximo permitido es 5 MB.`;
      setError(msg);
      throw new Error(msg);
    }

    setUploading(true);
    setProgress(0);

    try {
      // ── 3. Compress ──────────────────────────────────────────
      const compressed = await compressImage(file);

      // ── 4. Build unique storage path ─────────────────────────
      const safeName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .toLowerCase()
        .slice(0, 60);
      const storagePath = `products/${Date.now()}_${safeName}.jpg`;
      const storageRef  = ref(storage, storagePath);

      // ── 5. Upload with progress tracking ─────────────────────
      const downloadURL = await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, compressed, {
          contentType: 'image/jpeg',
          cacheControl: 'public,max-age=31536000',
        });

        task.on(
          'state_changed',
          (snap) => {
            const pct = Math.round(
              (snap.bytesTransferred / snap.totalBytes) * 100
            );
            setProgress(pct);
          },
          (err) => reject(err),
          async () => {
            try {
              const url = await getDownloadURL(task.snapshot.ref);
              resolve(url);
            } catch (e) {
              reject(e);
            }
          }
        );
      });

      setProgress(100);
      return downloadURL;
    } catch (err) {
      const msg = err.message || 'Error al subir la imagen. Intenta de nuevo.';
      setError(msg);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setProgress(0);
    setUploading(false);
  }, []);

  return { uploading, progress, error, uploadImage, reset };
}
