// src/components/ui/SearchBar.jsx
import { useState, useCallback } from 'react';
import './SearchBar.css';

export default function SearchBar({ onSearch, placeholder = 'Buscar productos...' }) {
  const [value, setValue] = useState('');
  const [timer, setTimer] = useState(null);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setValue(val);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => onSearch(val), 300);
    setTimer(t);
  }, [timer, onSearch]);

  const clear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <div className="searchbar">
      <span className="searchbar-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </span>
      <input
        type="search"
        className="searchbar-input"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
        id="product-search"
      />
      {value && (
        <button className="searchbar-clear" onClick={clear} aria-label="Limpiar búsqueda">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  );
}
