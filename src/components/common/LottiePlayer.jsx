import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

/**
 * Componente reutilizable para animaciones Lottie.
 * Soporta tanto objetos JSON locales como URLs externas.
 */
export default function LottiePlayer({ animationData, src, url, loop = true, className = "", style = {} }) {
  const source = animationData || src || url;
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!source) return;

    if (typeof source === 'object') {
      setData(source);
      return;
    }

    if (typeof source === 'string' && (source.startsWith('http') || source.startsWith('/'))) {
      fetch(source)
        .then(res => {
          if (!res.ok) throw new Error("Failed to load");
          return res.json();
        })
        .then(json => setData(json))
        .catch(err => {
          console.error("Error loading lottie from URL:", err);
          setError(true);
        });
    }
  }, [source]);

  if (error) return null;

  if (!data) return (
    <div 
      className={`lottie-loading ${className}`} 
      style={{ 
        height: style.height || '100px', 
        width: '100%',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        opacity: 0, 
        ...style 
      }}
    />
  );

  if (!data || typeof data !== 'object') return null;

  return (
    <div className={`lottie-container ${className}`} style={{ width: '100%', margin: '0 auto', ...style }}>
      <Lottie 
        animationData={data} 
        loop={loop}
        autoplay={true}
        onError={(err) => {
          console.error("Lottie player error:", err);
          setError(true);
        }}
      />
    </div>
  );
}
