import { ScanBarcode } from "lucide-react";

export default function BottomBar({ cartItems, total, onFinalize }) {
  const itemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className="font-inter text-xs text-muted-foreground">
          {itemCount > 0 ? `${itemCount} ${itemCount === 1 ? "item" : "itens"}` : "Nenhum item"}
        </span>
        <span className="font-inter font-extrabold text-lg text-foreground">
          R$ {total.toFixed(2)}
        </span>
      </div>
      <button
        onClick={onFinalize}
        disabled={itemCount === 0}
        className="flex-1 max-w-xs flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-2xl h-14 font-inter font-extrabold text-base shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ScanBarcode className="w-5 h-5" />
        Fazer Pedido
      </button>
    </div>
  );
}