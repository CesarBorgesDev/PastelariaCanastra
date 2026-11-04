import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Delete, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/api/client";
import { printOrder } from "@/lib/printOrder";
import { useToast } from "@/components/ui/use-toast";
import PrintPreview from "../components/PrintPreview";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function OrderConfirm() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [cartItems, setCartItems] = useState(state?.cartItems || []);
  const [step, setStep] = useState("attendant");
  const [attendants, setAttendants] = useState([]);
  const [loadingAttendants, setLoadingAttendants] = useState(true);
  const [attendant, setAttendant] = useState(null);
  const [comanda, setComanda] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  useEffect(() => {
    let active = true;
    api.attendants.listActive()
      .then((data) => {
        if (active) setAttendants(data);
      })
      .catch(() => {
        if (active) {
          setAttendants([]);
          toast({ title: "Não foi possível carregar os atendentes.", variant: "destructive" });
        }
      })
      .finally(() => {
        if (active) setLoadingAttendants(false);
      });
    return () => {
      active = false;
    };
  }, [toast]);

  const increment = (id) =>
    setCartItems((prev) =>
      prev.map((item) => (item.product.id === id ? { ...item, quantity: item.quantity + 1 } : item))
    );

  const decrement = (id) =>
    setCartItems((prev) =>
      prev
        .map((item) => (item.product.id === id ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0)
    );

  const remove = (id) => setCartItems((prev) => prev.filter((item) => item.product.id !== id));

  const goBack = () => {
    if (step === "comanda") {
      setStep("attendant");
      setComanda("");
      return;
    }
    if (step === "attendant") {
      setStep("review");
      return;
    }
    navigate(-1);
  };

  const selectAttendant = (person) => {
    setAttendant(person);
    setComanda("");
    setStep("comanda");
  };

  const appendDigit = (digit) => {
    setComanda((current) => (current.length >= 6 ? current : `${current}${digit}`));
  };

  const placeOrder = async (isEstufa) => {
    if (!attendant || saving || cartItems.length === 0) return;
    const orderNumber = Number(comanda);
    if (!isEstufa && (!Number.isInteger(orderNumber) || orderNumber < 1)) {
      toast({ title: "Digite o número da comanda.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const orderData = {
      order_number: isEstufa ? null : orderNumber,
      is_estufa: isEstufa,
      attendant_id: attendant.id,
      attendant_name: attendant.name,
      items: cartItems.map((item) => ({
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        notes: item.notes || "",
      })),
      total,
      status: "pendente",
      barcode: isEstufa
        ? `ESTUFA-${Date.now().toString().slice(-6)}`
        : `CMD-${orderNumber}-${Date.now().toString().slice(-6)}`,
    };
    try {
      const created = await api.orders.create(orderData);
      const saved = { ...orderData, ...created };
      setLastOrder(saved);
      setShowPrint(true);
      toast({
        title: isEstufa ? "Pedido da estufa criado!" : `Comanda ${orderNumber} criada!`,
        description: `${attendant.name} · R$ ${total.toFixed(2)}`,
      });
      try {
        await printOrder(saved);
        toast({ title: "Cupom enviado para a impressora" });
      } catch (error) {
        toast({ title: "Pedido salvo, impressão não enviada", description: error.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Não foi possível salvar o pedido", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4 border-b border-border bg-card">
        <button onClick={goBack} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-inter font-bold text-lg text-foreground">
            {step === "review" && "Conferência do Pedido"}
            {step === "attendant" && "Quem está atendendo?"}
            {step === "comanda" && attendant?.name}
          </h1>
          {step === "comanda" && (
            <p className="font-inter text-xs text-muted-foreground">Número da comanda</p>
          )}
        </div>
      </div>

      {step === "review" && (
        <>
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
          <div className="px-5 py-4 border-t border-border bg-card space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-inter text-muted-foreground text-sm">Total</span>
              <span className="font-inter font-extrabold text-2xl text-foreground">R$ {total.toFixed(2)}</span>
            </div>
            <Button
              onClick={() => setStep("attendant")}
              disabled={cartItems.length === 0}
              className="w-full h-14 text-base font-inter font-extrabold bg-primary hover:bg-primary/90 rounded-2xl"
            >
              Escolher atendente
            </Button>
          </div>
        </>
      )}

      {cartItems.length === 0 && step !== "review" && (
        <p className="text-center text-muted-foreground font-inter py-12">Nenhum item no pedido</p>
      )}

      {step === "attendant" && cartItems.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
          {loadingAttendants ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : attendants.length === 0 ? (
            <p className="text-center text-muted-foreground font-inter py-12">
              Nenhum atendente ativo. Cadastre no painel de administração.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {attendants.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => selectAttendant(person)}
                  className="min-h-28 rounded-2xl border border-border bg-card px-4 py-5 text-center font-inter font-bold text-lg text-foreground active:scale-[0.98] hover:border-primary hover:bg-primary/10 transition-all"
                >
                  {person.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "comanda" && cartItems.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 flex flex-col items-center">
          <div className="w-full max-w-md space-y-4">
            <div className="h-20 rounded-2xl border border-border bg-card flex items-center justify-center">
              <span className="font-inter font-extrabold text-4xl tracking-widest text-foreground">
                {comanda || "—"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {KEYS.map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => appendDigit(digit)}
                  className="h-16 rounded-2xl bg-card border border-border font-inter font-bold text-2xl text-foreground active:scale-95"
                >
                  {digit}
                </button>
              ))}
              <span />
              <button
                type="button"
                onClick={() => appendDigit("0")}
                className="h-16 rounded-2xl bg-card border border-border font-inter font-bold text-2xl text-foreground active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setComanda((current) => current.slice(0, -1))}
                className="h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center active:scale-95"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>
            <Button
              onClick={() => placeOrder(false)}
              disabled={saving || comanda.length === 0}
              className="w-full h-14 text-base font-inter font-extrabold bg-primary hover:bg-primary/90 rounded-2xl"
            >
              {saving ? "Salvando..." : "Confirmar comanda"}
            </Button>
            <Button
              variant="outline"
              onClick={() => placeOrder(true)}
              disabled={saving}
              className="w-full h-14 text-base font-inter font-extrabold rounded-2xl"
            >
              Estufa — sem número de comanda
            </Button>
          </div>
        </div>
      )}

      <PrintPreview
        open={showPrint}
        onClose={() => {
          setShowPrint(false);
          navigate("/");
        }}
        order={lastOrder}
      />
    </div>
  );
}
