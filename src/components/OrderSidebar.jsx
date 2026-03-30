import { Minus, Plus, Trash2, ScanBarcode, MessageSquare, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function CartItem({ item, onIncrement, onDecrement, onRemove, onNotesChange }) {
  const [showNotes, setShowNotes] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-secondary/50 rounded-xl p-3 space-y-2"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-inter font-bold text-sm text-foreground truncate">
            {item.product.name}
          </h4>
          <p className="font-inter text-xs text-muted-foreground">
            R$ {item.product.price?.toFixed(2)} un.
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onDecrement(item.product.id)}
            className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center active:scale-90 transition-transform"
          >
            <Minus className="w-3 h-3 text-foreground" />
          </button>
          <span className="font-inter font-bold text-sm w-8 text-center text-foreground">
            {item.quantity}
          </span>
          <button
            onClick={() => onIncrement(item.product.id)}
            className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-transform"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
              item.notes ? "bg-primary/20 text-primary" : "bg-card border border-border text-muted-foreground"
            )}
          >
            <MessageSquare className="w-3 h-3" />
          </button>
          <button
            onClick={() => onRemove(item.product.id)}
            className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {showNotes && (
        <Textarea
          placeholder="Ex: sem cebola, bem passado..."
          value={item.notes || ""}
          onChange={(e) => onNotesChange(item.product.id, e.target.value)}
          className="text-xs bg-card border-border resize-none h-16 font-inter"
        />
      )}

      <div className="text-right">
        <span className="font-inter font-extrabold text-primary text-sm">
          R$ {(item.product.price * item.quantity).toFixed(2)}
        </span>
      </div>
    </motion.div>
  );
}

export default function OrderSidebar({
  cartItems,
  onIncrement,
  onDecrement,
  onRemove,
  onNotesChange,
  onClearCart,
  onScan,
  onFinalize,
  total,
  isOpen,
  onClose,
}) {
  const itemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div
      className={cn(
        "flex flex-col bg-card border-l border-border h-full",
        "w-full lg:w-[380px] lg:min-w-[380px]",
        "fixed lg:static inset-0 z-50 lg:z-auto transition-transform duration-300",
        isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <h2 className="font-inter font-bold text-lg text-foreground">Comanda</h2>
          {itemCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {itemCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {cartItems.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-xs text-muted-foreground hover:text-destructive font-inter font-medium transition-colors"
            >
              Limpar
            </button>
          )}
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <AnimatePresence mode="popLayout">
          {cartItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-muted-foreground py-12"
            >
              <ShoppingBag className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-inter text-sm">Comanda vazia</p>
              <p className="font-inter text-xs mt-1">Toque nos itens para adicionar</p>
            </motion.div>
          ) : (
            cartItems.map((item) => (
              <CartItem
                key={item.product.id}
                item={item}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onRemove={onRemove}
                onNotesChange={onNotesChange}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-inter text-sm text-muted-foreground">Total</span>
          <span className="font-inter font-extrabold text-2xl text-foreground">
            R$ {total.toFixed(2)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={onScan}
            variant="outline"
            className="h-14 text-sm font-inter font-bold gap-2 border-primary/30 text-primary hover:bg-primary/10"
            disabled={cartItems.length === 0}
          >
            <ScanBarcode className="w-5 h-5" />
            Bipar
          </Button>
          <Button
            onClick={onFinalize}
            className="h-14 text-sm font-inter font-bold gap-2 bg-primary hover:bg-primary/90"
            disabled={cartItems.length === 0}
          >
            Finalizar
          </Button>
        </div>
      </div>
    </div>
  );
}