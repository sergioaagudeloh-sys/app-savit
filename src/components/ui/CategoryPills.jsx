// src/components/ui/CategoryPills.jsx
import './CategoryPills.css';

export default function CategoryPills({ categories, selected, onSelect }) {
  return (
    <div className="category-pills scroll-x">
      <div className="category-pills-inner">
        {categories.map(cat => (
          <button
            key={cat.name}
            className={`category-pill ${selected === cat.name ? 'active' : ''}`}
            onClick={() => onSelect(cat.name)}
          >
            <span className="pill-icon">{cat.icon}</span>
            <span className="pill-name">{cat.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
