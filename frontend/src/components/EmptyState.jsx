export default function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <h3 className="font-semibold text-text">{title}</h3>
      {description ? <p className="mt-2 text-sm text-muted max-w-md mx-auto">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
