export default function Select({ className = "", children, ...props }) {
  return (
    <select
      className={`w-full rounded-lg border border-brand-line px-3.5 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
