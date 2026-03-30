import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

export default function PrintPreview({ open, onClose, order }) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black max-w-sm p-0 overflow-hidden">
        {/* Thermal printer style receipt */}
        <div className="p-6 font-mono text-xs space-y-3">
          <div className="text-center space-y-1">
            <p className="text-lg font-bold">PASTELARIA CANASTRA</p>
            <p className="text-[10px]">Desde 1979</p>
            <p className="text-[10px]">─────────────────────────</p>
          </div>

          <div className="text-center">
            <p className="text-sm font-bold">PEDIDO #{order.order_number}</p>
            <p className="text-[10px]">{new Date().toLocaleString("pt-BR")}</p>
          </div>

          <div>
            <p>─────────────────────────</p>
            <div className="space-y-2 my-2">
              {order.items.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between">
                    <span className="font-bold">{item.quantity}x {item.product_name}</span>
                    <span>R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                  </div>
                  {item.notes && (
                    <p className="text-[10px] ml-4 text-gray-600">→ {item.notes}</p>
                  )}
                </div>
              ))}
            </div>
            <p>─────────────────────────</p>
          </div>

          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL</span>
            <span>R$ {order.total.toFixed(2)}</span>
          </div>

          <div className="text-center space-y-1 pt-2">
            <p>─────────────────────────</p>
            <p className="text-[10px]">Obrigado pela preferência!</p>
            <p className="text-[10px]">Volte sempre 🧡</p>
          </div>
        </div>

        <div className="flex gap-2 p-4 bg-gray-50 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1 text-black border-gray-300">
            <X className="w-4 h-4 mr-1" /> Fechar
          </Button>
          <Button onClick={handlePrint} className="flex-1 bg-black text-white hover:bg-gray-800">
            <Printer className="w-4 h-4 mr-1" /> Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}