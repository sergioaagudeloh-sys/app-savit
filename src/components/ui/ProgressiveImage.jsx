// src/components/ui/ProgressiveImage.jsx
import { useState } from 'react';
import './ProgressiveImage.css';

/**
 * ProgressiveImage — Shows a blurred placeholder while the real image loads,
 * then cross-fades to full quality. Falls back to an emoji if the image errors.
 */
export default function ProgressiveImage({
  src,
  alt,
  fallback = '🌿',
  className = '',
  style = {},
  onLoad,
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className={`prog-img-fallback ${className}`} style={style}>
        {fallback}
      </div>
    );
  }

  return (
    <div className={`prog-img-wrapper ${className}`} style={style}>
      {/* 1. Full-quality image (on top eventually) */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`prog-img prog-img--full ${loaded ? 'prog-img--visible' : ''}`}
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
        onError={() => setErrored(true)}
      />

      {/* 2. Blurred thumbnail (underneath or fading out) */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className={`prog-img prog-img--blur ${loaded ? 'prog-img--hidden' : ''}`}
      />
    </div>
  );
}
