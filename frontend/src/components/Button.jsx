export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  const styles = {
    primary: "bg-secondary text-text border border-border hover:border-accent/40 hover:text-accent",
    accent: "bg-accent text-primary hover:bg-accent/90 font-semibold",
    danger: "bg-danger text-white hover:bg-danger/90",
    ghost: "bg-card text-text border border-border hover:border-accent/40 hover:text-accent",
    success: "bg-success text-primary hover:bg-success/90 font-semibold",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
