import React, { useState, useRef, useEffect, useMemo } from 'react';
import './ProductPicker.css';

export default function ProductPicker({ products, selectedProductId, onSelect, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('none'); // none, asc, desc
  const containerRef = useRef(null);

  // Handles Body Scroll Lock and Outside Clicks
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (sortOrder === 'asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    }

    return result;
  }, [products, searchTerm, sortOrder]);

  const toggleSort = (e) => {
    e.stopPropagation();
    setSortOrder(prev => prev === 'none' ? 'asc' : prev === 'asc' ? 'desc' : 'none');
  };

  const handleSelect = (product) => {
    onSelect(product ? product.id : '');
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="product-picker" ref={containerRef}>
      {/* Selected Value Display */}
      <div 
        className={`picker-trigger ${isOpen ? 'active' : ''} ${selectedProduct ? 'has-value' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedProduct ? (
           <div className="picker-trigger-content">
             {selectedProduct.imageUrl ? (
               <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="picker-thumb" />
             ) : (
               <div className="picker-thumb-placeholder">📦</div>
             )}
             <div className="picker-trigger-text">
               <span className="picker-trigger-name">{selectedProduct.name}</span>
               <span className="picker-trigger-price">${selectedProduct.price}</span>
             </div>
           </div>
        ) : (
          <span className="picker-trigger-placeholder">-- Selecciona un producto (Opcional) --</span>
        )}
        <div className="picker-trigger-actions">
          {selectedProduct && (
            <button 
              className="picker-clear-btn" 
              onClick={(e) => { e.stopPropagation(); handleSelect(null); }}
              title="Quitar producto"
            >
              ✕
            </button>
          )}
          <span className="picker-trigger-icon">▼</span>
        </div>
      </div>

      {/* Mobile-Friendly Modal/Drawer */}
      {isOpen && (
        <div className="picker-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="picker-modal-content" onClick={e => e.stopPropagation()}>
            <div className="picker-search-bar">
              <div className="picker-search-input-wrapper">
                <span className="picker-search-icon">🔍</span>
                <input 
                  type="text" 
                  placeholder="Buscar producto..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="picker-search-input"
                  autoFocus
                />
              </div>
              <button 
                className={`picker-sort-btn ${sortOrder !== 'none' ? 'active' : ''}`}
                onClick={toggleSort}
                title="Ordenar A-Z"
              >
                {sortOrder === 'asc' ? 'A-Z ↓' : sortOrder === 'desc' ? 'Z-A ↑' : 'A-Z'}
              </button>
            </div>
            
            <div className="picker-list">
              {searchTerm.trim() === '' && (
                <div 
                  className={`picker-item ${!selectedProductId ? 'selected' : ''}`}
                  onClick={() => handleSelect(null)}
                >
                  <div className="picker-item-content">
                    <span className="text-muted" style={{fontStyle: 'italic', color: '#888'}}>-- Sin producto vinculado --</span>
                  </div>
                </div>
              )}
              
              {filteredAndSortedProducts.length === 0 ? (
                <div className="picker-empty-state">No se encontraron productos.</div>
              ) : (
                filteredAndSortedProducts.map(p => (
                  <div 
                    key={p.id} 
                    className={`picker-item ${selectedProductId === p.id ? 'selected' : ''}`}
                    onClick={() => handleSelect(p)}
                  >
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="picker-item-thumb" />
                    ) : (
                      <div className="picker-item-thumb-placeholder">📦</div>
                    )}
                    <div className="picker-item-details">
                      <div className="picker-item-name">{p.name}</div>
                      <div className="picker-item-price">${p.price}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
