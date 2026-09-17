export default function Input({ label, className = "", ...props }) {
  return (
    <label className={`block text-sm ${className}`}>
      {label ? <span className="mb-1 block text-muted">{label}</span> : null}
      <input
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text outline-none placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/20"
        {...props}
      />
    </label>
  );
}
