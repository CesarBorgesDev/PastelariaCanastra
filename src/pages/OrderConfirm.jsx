import { useLocation, useNavigate } from "react-router-dom";
import { ScanBarcode, ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { api } from "@/api/client";
import { printOrder } from "@/lib/printOrder";
import { useToast } from "@/components/ui/use-toast";
import ScanModal from "../components/ScanModal";
import PrintPreview from "../components/PrintPreview";

export default function OrderConfirm() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [cartItems, setCartItems] = useState(state?.cartItems || []);
  const [showScan, setShowScan] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [orderCounter] = useState(Math.floor(Math.random() * 900) + 100);

  const total = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const increment = (id) =>
    setCartItems((prev) =>
      prev.map((i) => (i.product.id === id ? { ...i, quantity: i.quantity + 1 } : i))
    );

  const decrement = (id) =>
    setCartItems((prev) =>
      prev.map((i) => (i.product.id === id ? { ...i, quantity: i.quantity - 1 } : i)).filter((i) => i.quantity > 0)
    );

  const remove = (id) => setCartItems((prev) => prev.filter((i) => i.product.id !== id));

  const confirmOrder = async () => {
    const newOrderNumber = orderCounter + 1;
    const orderData = {
      order_number: newOrderNumber,
      items: cartItems.map((i) => ({
        product_name: i.product.name,
        quantity: i.quantity,
        unit_price: i.product.price,
        notes: i.notes || "",
      })),
      total,
      status: "pendente",
      barcode: `CMD-${newOrderNumber}-${Date.now().toString().slice(-6)}`,
    };
    const created = await api.orders.create(orderData);
    const saved = { ...orderData, id: created.id };
    setLastOrder(saved);
    setShowPrint(true);
    toast({ title: `Pedido #${newOrderNumber} criado!`, description: `Total: R$ ${total.toFixed(2)}` });
    try {
      await printOrder(saved);
      toast({ title: "Cupom enviado para a impressora" });
    } catch (error) {
      toast({ title: "Pedido salvo, impressão não enviada", description: error.message, variant: "destructive" });
    }
  };

  const handleScanConfirm = async () => {
    setShowScan(false);
    await confirmOrder();
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-border bg-card">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-inter font-bold text-lg text-foreground">Conferência do Pedido</h1>
      </div>

      {/* Items */}
      <div className="menu-scroll flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
        {cartItems.length === 0 && (
          <p className="text-center text-muted-foreground font-inter py-12">Nenhum item no pedido</p>
        )}
        {cartItems.map((item) => (
          <div key={item.product.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
            {item.product.image_url && (
              <img src={item.product.image_url} alt={item.product.name} className="w-16 h-16 rounded-xl object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-inter font-bold text-sm text-foreground truncate">{item.product.name}</p>
              {item.notes && <p className="font-inter text-xs text-muted-foreground">→ {item.notes}</p>}
              <p className="font-inter font-extrabold text-primary mt-1">
                R$ {(item.product.price * item.quantity).toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => decrement(item.product.id)} className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center active:scale-90 transition-transform">
                <Minus className="w-3 h-3 text-foreground" />
              </button>
              <span className="font-inter font-bold text-sm w-6 text-center">{item.quantity}</span>
              <button onClick={() => increment(item.product.id)} className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-transform">
                <Plus className="w-3 h-3" />
              </button>
              <button onClick={() => remove(item.product.id)} className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-destructive ml-1 active:scale-90 transition-transform">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border bg-card space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-inter text-muted-foreground text-sm">Total</span>
          <span className="font-inter font-extrabold text-2xl text-foreground">R$ {total.toFixed(2)}</span>
        </div>
        <Button
          onClick={() => setShowScan(true)}
          disabled={cartItems.length === 0}
          className="w-full h-14 text-base font-inter font-extrabold gap-3 bg-primary hover:bg-primary/90 rounded-2xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
        >
          <ScanBarcode className="w-6 h-6" />
          Finalizar Pedido
        </Button>
      </div>

      <ScanModal open={showScan} onClose={() => setShowScan(false)} onConfirm={handleScanConfirm} orderNumber={orderCounter + 1} />
      <PrintPreview open={showPrint} onClose={() => { setShowPrint(false); navigate("/"); }} order={lastOrder} />
    </div>
  );
}