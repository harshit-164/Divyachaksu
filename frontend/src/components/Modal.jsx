export default function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-primary/70" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-semibold text-text">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-text">
            ✕
          </button>
        </div>
        <div className="px-4 py-4 text-text">{children}</div>
        {footer ? <div className="border-t border-border px-4 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}
