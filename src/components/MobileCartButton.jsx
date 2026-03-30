import { ShoppingBag, ScanBarcode } from "lucide-react";

export default function MobileCartButton({ itemCount, total, onOpenCart, onOrder }) {
  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 lg:hidden z-40 flex flex-col items-end gap-3">
      <button
        onClick={onOpenCart}
        className="relative flex items-center justify-center bg-secondary border border-border text-foreground rounded-2xl w-14 h-14 shadow-xl active:scale-[0.98] transition-transform"
      >
        <ShoppingBag className="w-6 h-6" />
        <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
          {itemCount}
        </span>
      </button>
      <button
        onClick={onOrder}
        className="flex items-center gap-2 bg-primary text-primary-foreground rounded-2xl px-5 py-4 shadow-xl shadow-primary/30 active:scale-[0.98] transition-transform"
      >
        <ScanBarcode className="w-5 h-5" />
        <span className="font-inter font-extrabold text-base">Fazer Pedido</span>
        <span className="font-inter font-extrabold text-lg ml-2">R$ {total.toFixed(2)}</span>
      </button>
    </div>
  );
}