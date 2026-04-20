import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './CategoryPills.css';

export default function CategoryPills({ categories, selected, onSelect }) {
  const scrollRef = useRef(null);

  // Efecto para centrar la categoría activa automáticamente
  useEffect(() => {
    if (scrollRef.current) {
      const activeElement = scrollRef.current.querySelector('.category-pill.active');
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest'
        });
      }
    }
  }, [selected]);

  return (
    <div className="category-pills scroll-x" ref={scrollRef}>
      <div className="category-pills-inner">
        <AnimatePresence mode="popLayout">
          {categories.map(cat => {
            const isActive = selected === cat.name;
            return (
              <motion.button
                key={cat.name}
                className={`category-pill ${isActive ? 'active' : ''}`}
                onClick={() => onSelect(cat.name)}
                initial={false}
                animate={{
                  scale: isActive ? 1.05 : 1,
                  transition: { type: 'spring', stiffness: 400, damping: 25 }
                }}
                whileTap={{ scale: 0.95 }}
                style={{ position: 'relative' }}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-category-pill"
                    className="category-pill-active-bg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="pill-icon" style={{ zIndex: 1 }}>{cat.icon}</span>
                <span className="pill-name" style={{ zIndex: 1 }}>{cat.name}</span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

