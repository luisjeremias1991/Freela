export default function Modal({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-[200]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-brand-line rounded-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6"
      >
        {children}
      </div>
    </div>
  );
}
