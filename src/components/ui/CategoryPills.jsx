// src/components/ui/CategoryPills.jsx
import { motion } from 'framer-motion';
import './CategoryPills.css';

export default function CategoryPills({ categories, selected, onSelect }) {
  return (
    <div className="category-pills scroll-x">
      <div className="category-pills-inner">
        {categories.map(cat => {
          const isActive = selected === cat.name;
          return (
            <button
              key={cat.name}
              className={`category-pill ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(cat.name)}
              style={{ position: 'relative' }} // Necesario para el layout absolut de framer
            >
              {isActive && (
                <motion.div
                  layoutId="active-category-pill"
                  className="category-pill-active-bg"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <span className="pill-icon" style={{ zIndex: 1 }}>{cat.icon}</span>
              <span className="pill-name" style={{ zIndex: 1 }}>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

