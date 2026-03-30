import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanBarcode, X } from "lucide-react";

export default function OrderConfirmModal({ open, onClose, onConfirm, cartItems, total }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-inter font-bold text-lg text-foreground">Conferência do Pedido</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Items */}
        <div className="px-6 py-4 space-y-3 max-h-80 overflow-y-auto">
          {cartItems.map((item) => (
            <div key={item.product.id} className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-inter font-semibold text-sm text-foreground">
                  {item.quantity}x {item.product.name}
                </p>
                {item.notes && (
                  <p className="font-inter text-xs text-muted-foreground mt-0.5">→ {item.notes}</p>
                )}
              </div>
              <span className="font-inter font-bold text-sm text-primary whitespace-nowrap">
                R$ {(item.product.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Total + Finalize */}
        <div className="px-6 py-4 border-t border-border space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-inter text-sm text-muted-foreground">Total</span>
            <span className="font-inter font-extrabold text-2xl text-foreground">
              R$ {total.toFixed(2)}
            </span>
          </div>
          <Button
            onClick={onConfirm}
            className="w-full h-14 text-base font-inter font-extrabold gap-3 bg-primary hover:bg-primary/90 rounded-2xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
          >
            <ScanBarcode className="w-6 h-6" />
            Finalizar Pedido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}