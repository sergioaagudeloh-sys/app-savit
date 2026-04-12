// src/components/ui/OrderTimeline.jsx
import './OrderTimeline.css';

const STEPS = [
  { key: 'pending',   label: 'Recibido',    icon: '📋' },
  { key: 'approved',  label: 'Aprobado',    icon: '✅' },
  { key: 'completed', label: 'En Camino',   icon: '🛵' },
  { key: 'delivered', label: 'Entregado',   icon: '🏁' },
];

const STATUS_ORDER = ['pending', 'approved', 'completed', 'delivered'];

export default function OrderTimeline({ status }) {
  // Cancelled orders get a special display
  if (status === 'cancelled') {
    return (
      <div className="order-timeline order-timeline--cancelled">
        <div className="ot-cancelled-icon">✕</div>
        <div className="ot-cancelled-label">Pedido Cancelado</div>
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(status);
  if (currentIdx === -1) return null;

  return (
    <div className="order-timeline">
      {STEPS.map((step, idx) => {
        const isDone    = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFuture  = idx > currentIdx;

        return (
          <div
            key={step.key}
            className={`ot-step${isDone ? ' ot-step--done' : ''}${isCurrent ? ' ot-step--current' : ''}${isFuture ? ' ot-step--future' : ''}`}
          >
            {/* Connector line before each step (except first) */}
            {idx > 0 && (
              <div className={`ot-connector${isDone || isCurrent ? ' ot-connector--active' : ''}`} />
            )}

            <div className="ot-node">
              {isDone ? (
                <span className="ot-check">✓</span>
              ) : (
                <span className="ot-icon">{step.icon}</span>
              )}
            </div>
            <div className="ot-label">{step.label}</div>
          </div>
        );
      })}
    </div>
  );
}
