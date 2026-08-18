export default function Card({ ref, className = "", children, ...props }) {
  return (
    <div
      ref={ref}
      className={`bg-white border border-brand-line rounded-xl p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
