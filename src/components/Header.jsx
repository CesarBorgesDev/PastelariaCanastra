import { Clock, User, ScanBarcode, ShoppingBag } from "lucide-react";
import { useState, useEffect } from "react";

export default function Header({ itemCount = 0, total = 0, onOpenCart, onOrder }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-card border-b border-border">
      <div className="flex items-center gap-4">
        <img
          src="https://media.base44.com/images/public/user_691489324af99e2dfcd3ecc0/31a86f752_PastelariaCanastradesde1979.png"
          alt="Pastelaria Canastra"
          className="h-12 object-contain"
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span className="font-inter text-sm font-medium tabular-nums">
            {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        {/* Desktop: Atendente */}
        <div className="hidden lg:flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
          <User className="w-4 h-4 text-primary" />
          <span className="font-inter text-sm font-medium text-foreground">Atendente</span>
        </div>

        {/* Mobile/Tablet: Fazer Pedido button */}
        {itemCount > 0 && (
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={onOpenCart}
              className="relative flex items-center justify-center bg-secondary border border-border text-foreground rounded-xl w-10 h-10 active:scale-95 transition-transform"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            </button>
            <button
              onClick={onOrder}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2 shadow-lg shadow-primary/30 active:scale-95 transition-transform"
            >
              <ScanBarcode className="w-4 h-4" />
              <span className="font-inter font-bold text-sm">R$ {total.toFixed(2)}</span>
            </button>
          </div>
        )}
        {itemCount === 0 && (
          <div className="flex lg:hidden items-center gap-2 bg-secondary rounded-lg px-3 py-2">
            <User className="w-4 h-4 text-primary" />
            <span className="font-inter text-sm font-medium text-foreground">Atendente</span>
          </div>
        )}
      </div>
    </header>
  );
}