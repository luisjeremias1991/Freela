export default function Label({ className = "", children, ...props }) {
  return (
    <label
      className={`block text-xs font-semibold uppercase tracking-wide text-brand-muted mb-1.5 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}
