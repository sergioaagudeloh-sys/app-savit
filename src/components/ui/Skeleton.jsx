// src/components/ui/Skeleton.jsx
import React from 'react';

export const ProductSkeleton = () => (
  <div className="product-card">
    <div className="skeleton skeleton-img" />
    <div className="skeleton skeleton-title" style={{ width: '80%' }} />
    <div className="skeleton skeleton-text" style={{ width: '90%' }} />
    <div className="skeleton skeleton-text" style={{ width: '40%' }} />
  </div>
);

export const CategorySkeleton = () => (
  <div className="category-circle-item">
    <div className="skeleton skeleton-circle" />
    <div className="skeleton skeleton-text mt-xs" style={{ width: '60px' }} />
  </div>
);

export const OrderSkeleton = () => (
  <div className="order-card">
    <div className="flex-between mb-sm">
      <div className="skeleton skeleton-title" style={{ width: '100px' }} />
      <div className="skeleton" style={{ width: '80px', height: '20px', borderRadius: '100px' }} />
    </div>
    <div className="skeleton skeleton-text" style={{ width: '90%' }} />
    <div className="skeleton skeleton-text" style={{ width: '70%' }} />
    <div className="skeleton skeleton-text mt-md" style={{ width: '40%' }} />
  </div>
);

export const AdminProductSkeleton = () => (
  <div className="product-admin-item">
    <div className="skeleton skeleton-img" style={{ width: '72px', height: '72px' }} />
    <div className="product-admin-info">
      <div className="skeleton skeleton-title" style={{ width: '60%' }} />
      <div className="skeleton skeleton-text" style={{ width: '40%' }} />
      <div className="flex gap-sm mt-sm">
        <div className="skeleton" style={{ width: '60px', height: '28px' }} />
        <div className="skeleton" style={{ width: '60px', height: '28px' }} />
      </div>
    </div>
  </div>
);
