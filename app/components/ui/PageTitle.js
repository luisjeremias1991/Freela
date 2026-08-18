export default function PageTitle({ className = "", children }) {
  return (
    <h1 className={`text-2xl font-bold text-gray-900 mb-6 ${className}`}>
      {children}
    </h1>
  );
}
