import { ShoppingBag } from "lucide-react";

export default function MobileCartButton({ itemCount, total, onClick }) {
  if (itemCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 left-4 right-4 lg:hidden z-40 bg-primary text-primary-foreground rounded-2xl px-5 py-4 flex items-center justify-between shadow-xl shadow-primary/30 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <ShoppingBag className="w-6 h-6" />
          <span className="absolute -top-1.5 -right-1.5 bg-white text-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {itemCount}
          </span>
        </div>
        <span className="font-inter font-bold text-sm">Ver Comanda</span>
      </div>
      <span className="font-inter font-extrabold text-lg">
        R$ {total.toFixed(2)}
      </span>
    </button>
  );
}