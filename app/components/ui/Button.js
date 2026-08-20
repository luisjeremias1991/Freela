const VARIANTES = {
  primary: "bg-brand-primary text-white hover:opacity-90",
  secondary: "bg-transparent border border-brand-primary text-brand-primary hover:bg-brand-navy-tint",
};

export default function Button({ variant = "primary", className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-5 py-2.5 font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTES[variant]} ${className}`}
      {...props}
    />
  );
}
