export default function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`bg-white border border-brand-line rounded-xl p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
