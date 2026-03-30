import ProductCard from "./ProductCard";

export default function ProductGrid({ products, onAddItem, cartItems }) {
  const getItemCount = (productId) => {
    const item = cartItems.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  if (products.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground font-inter">
        <p>Nenhum produto encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAdd={onAddItem}
            itemCount={getItemCount(product.id)}
          />
        ))}
      </div>
    </div>
  );
}