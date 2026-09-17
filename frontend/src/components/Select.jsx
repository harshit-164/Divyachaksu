export default function Select({ label, options = [], className = "", ...props }) {
  return (
    <label className={`block text-sm ${className}`}>
      {label ? <span className="mb-1 block text-muted">{label}</span> : null}
      <select
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt} className="bg-card text-text">
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    </label>
  );
}
