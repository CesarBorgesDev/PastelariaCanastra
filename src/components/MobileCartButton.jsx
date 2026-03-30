import { ShoppingBag, ScanBarcode } from "lucide-react";

export default function MobileCartButton({ itemCount, total, onOpenCart, onOrder }) {
  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 lg:hidden z-40 flex gap-3">
      <button
        onClick={onOpenCart}
        className="flex items-center gap-2 bg-secondary border border-border text-foreground rounded-2xl px-4 py-4 shadow-xl active:scale-[0.98] transition-transform"
      >
        <div className="relative">
          <ShoppingBag className="w-6 h-6" />
          <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {itemCount}
          </span>
        </div>
      </button>
      <button
        onClick={onOrder}
        className="flex-1 flex items-center justify-between bg-primary text-primary-foreground rounded-2xl px-5 py-4 shadow-xl shadow-primary/30 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-2">
          <ScanBarcode className="w-5 h-5" />
          <span className="font-inter font-extrabold text-base">Fazer Pedido</span>
        </div>
        <span className="font-inter font-extrabold text-lg">
          R$ {total.toFixed(2)}
        </span>
      </button>
    </div>
  );
}