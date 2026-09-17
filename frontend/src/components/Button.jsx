export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  const styles = {
    primary: "bg-secondary text-text border border-white/10 hover:border-accent/40 hover:text-accent",
    accent: "bg-accent text-[#190f18] hover:bg-[#e5bae3] font-semibold shadow-[0_8px_24px_rgba(217,167,215,0.14)]",
    danger: "bg-danger text-white hover:bg-danger/90",
    ghost: "bg-card/80 text-text border border-white/10 hover:border-accent/40 hover:bg-white/[0.05] hover:text-text",
    success: "bg-success text-primary hover:bg-success/90 font-semibold",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition duration-200 active:scale-[0.98] disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
