// src/components/ui/Skeleton.jsx
import './Skeleton.css';

/* ─────────────────────────────────────────────
   Primitivo base
───────────────────────────────────────────── */
export function SkeletonBox({ className = '', style = {} }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

/* ─────────────────────────────────────────────
   Hero Skeleton — Imita el hero verde del admin
───────────────────────────────────────────── */
export function SkeletonHero({ stats = 2 }) {
  return (
    <div className="sk-hero">
      <SkeletonBox className="sk-hero-label" />
      <SkeletonBox className="sk-hero-title" />
      <SkeletonBox className="sk-hero-subtitle" />
      <div className="sk-hero-stats">
        {Array.from({ length: stats }).map((_, i) => (
          <SkeletonBox key={i} className="sk-hero-stat" />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Card Skeleton — imita una cfg-card / premium-card
───────────────────────────────────────────── */
export function SkeletonCard({ lines = 2, showAvatar = true }) {
  return (
    <div className="sk-card">
      <div className="sk-card-header">
        {showAvatar && <SkeletonBox className="sk-avatar" />}
        <div className="sk-card-lines">
          <SkeletonBox className="sk-line sk-line-lg" />
          <SkeletonBox className="sk-line sk-line-md" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          className={`sk-line ${i === lines - 1 ? 'sk-line-sm' : 'sk-line-full'}`}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   List Item Skeleton — fila de pedido/producto
───────────────────────────────────────────── */
export function SkeletonListItem() {
  return (
    <div className="sk-list-item">
      <SkeletonBox className="sk-list-img" />
      <div className="sk-list-content">
        <SkeletonBox className="sk-line sk-line-lg" />
        <SkeletonBox className="sk-line sk-line-md" />
      </div>
      <SkeletonBox className="sk-list-badge" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Stats Row Skeleton — hero-stat-btn
───────────────────────────────────────────── */
export function SkeletonStats({ count = 2 }) {
  return (
    <div className="sk-stat-row">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBox key={i} className="sk-stat-chip" />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Chart Skeleton
───────────────────────────────────────────── */
export function SkeletonChart() {
  return <SkeletonBox className="sk-chart" />;
}

/* ─────────────────────────────────────────────
   Section Title Skeleton
───────────────────────────────────────────── */
export function SkeletonSectionTitle() {
  return <SkeletonBox className="sk-section-title" />;
}

/* ─────────────────────────────────────────────
   Product Grid Skeleton
───────────────────────────────────────────── */
export function SkeletonProductGrid({ count = 4 }) {
  return (
    <div className="sk-product-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="sk-product-card">
          <SkeletonBox className="sk-product-img" />
          <div className="sk-product-info">
            <SkeletonBox className="sk-line sk-line-full" />
            <SkeletonBox className="sk-line sk-line-md" />
            <SkeletonBox className="sk-line sk-line-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Dashboard Full Skeleton
───────────────────────────────────────────── */
export function SkeletonDashboard() {
  return (
    <div style={{ padding: '0 16px 80px' }}>
      <SkeletonHero stats={2} />
      <SkeletonSectionTitle />
      <div className="sk-stat-row">
        {[0, 1, 2, 3].map(i => (
          <SkeletonBox key={i} style={{ flex: 1, height: 72, borderRadius: 14 }} />
        ))}
      </div>
      <SkeletonSectionTitle />
      <SkeletonChart />
      <SkeletonSectionTitle />
      {[0, 1, 2].map(i => <SkeletonListItem key={i} />)}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Orders List Skeleton
───────────────────────────────────────────── */
export function SkeletonOrdersList({ count = 5 }) {
  return (
    <>
      <SkeletonHero stats={2} />
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────
   Products Page Skeleton
───────────────────────────────────────────── */
export function SkeletonProductsPage() {
  return (
    <>
      <SkeletonHero stats={2} />
      <SkeletonProductGrid count={4} />
    </>
  );
}

/* ─────────────────────────────────────────────
   Individual Skeletons for Iteration
   ───────────────────────────────────────────── */

export function ProductSkeleton() {
  return (
    <div className="sk-product-card">
      <SkeletonBox className="sk-product-img" />
      <div className="sk-product-info" style={{ padding: '8px 0' }}>
        <SkeletonBox className="sk-line sk-line-full" />
        <SkeletonBox className="sk-line sk-line-md" style={{ marginTop: 4 }} />
        <SkeletonBox className="sk-line sk-line-sm" style={{ marginTop: 4 }} />
      </div>
    </div>
  );
}

export function OrderSkeleton() {
  return <SkeletonListItem />;
}

export function AdminProductSkeleton() {
  return <SkeletonListItem />;
}

export function CategorySkeleton() {
  return <SkeletonBox style={{ width: 100, height: 40, borderRadius: 20, flexShrink: 0 }} />;
}
