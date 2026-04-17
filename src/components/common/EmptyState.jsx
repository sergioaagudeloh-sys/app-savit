import React from 'react';
import './EmptyState.css';

/**
 * EmptyState Component
 * @param {string} title - Main text
 * @param {string} message - Secondary text
 * @param {string} icon - Emoji or Icon component
 * @param {React.ReactNode} action - Optional button or link
 */
const EmptyState = ({ 
  title = "No hay nada por aquí", 
  message = "Intenta con otra búsqueda o regresa más tarde.", 
  icon = "📦", 
  action 
}) => {
  return (
    <div className="empty-state-container animate-fade-in">
      <div className="empty-state-icon-wrapper">
        <span className="empty-state-icon" role="img" aria-label="empty">
          {icon}
        </span>
        <div className="empty-state-blob"></div>
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
};

export default EmptyState;
