export default function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-lg border border-brand-line px-3.5 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition ${className}`}
      {...props}
    />
  );
}
