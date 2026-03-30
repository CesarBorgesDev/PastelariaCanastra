import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import Header from "../components/Header";
import CategoryTabs from "../components/CategoryTabs";
import ProductGrid from "../components/ProductGrid";
import OrderSidebar from "../components/OrderSidebar";
import ScanModal from "../components/ScanModal";
import PrintPreview from "../components/PrintPreview";
import MobileCartButton from "../components/MobileCartButton";
import BottomBar from "../components/BottomBar";
import OrderConfirmModal from "../components/OrderConfirmModal";

export default function Home() {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [cartItems, setCartItems] = useState([]);
  const [showScan, setShowScan] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orderCounter, setOrderCounter] = useState(
    Math.floor(Math.random() * 900) + 100
  );

  useEffect(() => {
    const loadProducts = async () => {
      const data = await base44.entities.Product.filter({ available: true });
      setProducts(data);
      setLoading(false);
    };
    loadProducts();
  }, []);

  const filteredProducts =
    activeCategory === "all"
      ? products
      : products.filter((p) => p.category === activeCategory);

  const total = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const itemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const addItem = useCallback((product) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1, notes: "" }];
    });
  }, []);

  const increment = useCallback((productId) => {
    setCartItems((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, quantity: i.quantity + 1 } : i
      )
    );
  }, []);

  const decrement = useCallback((productId) => {
    setCartItems((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i
        )
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((productId) => {
    setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateNotes = useCallback((productId, notes) => {
    setCartItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, notes } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const finalizeOrder = () => {
    if (cartItems.length === 0) return;
    setShowConfirm(true);
  };

  const handleConfirmProceed = () => {
    setShowConfirm(false);
    setShowScan(true);
  };

  const confirmOrder = async () => {
    const newOrderNumber = orderCounter + 1;
    setOrderCounter(newOrderNumber);

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

    const created = await base44.entities.Order.create(orderData);
    setLastOrder({ ...orderData, id: created.id });
    setShowPrint(true);
    setCartItems([]);

    toast({
      title: "Pedido #" + newOrderNumber + " criado!",
      description: `Total: R$ ${total.toFixed(2)}`,
    });
  };

  const handleScanConfirm = async () => {
    setShowScan(false);
    await confirmOrder();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="font-inter text-sm text-muted-foreground">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header
        itemCount={itemCount}
        total={total}
        onOpenCart={() => setSidebarOpen(true)}
        onOrder={() => setShowScan(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
          <div className="flex-1 overflow-hidden pb-24 lg:pb-0">
            <ProductGrid
              products={filteredProducts}
              onAddItem={addItem}
              cartItems={cartItems}
            />
          </div>
        </div>

        {/* Sidebar */}
        <OrderSidebar
          cartItems={cartItems}
          onIncrement={increment}
          onDecrement={decrement}
          onRemove={removeItem}
          onNotesChange={updateNotes}
          onClearCart={clearCart}
          onScan={() => setShowScan(true)}
          onFinalize={finalizeOrder}
          total={total}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>



      {/* Scan Modal */}
      <ScanModal
        open={showScan}
        onClose={() => setShowScan(false)}
        onConfirm={handleScanConfirm}
        orderNumber={orderCounter + 1}
      />

      <BottomBar cartItems={cartItems} total={total} onFinalize={finalizeOrder} />

      <OrderConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmProceed}
        cartItems={cartItems}
        total={total}
      />

      {/* Print Preview */}
      <PrintPreview
        open={showPrint}
        onClose={() => setShowPrint(false)}
        order={lastOrder}
      />
    </div>
  );
}