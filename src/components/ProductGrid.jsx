import ProductCard from "./ProductCard";

export default function ProductGrid({ products, onAddItem, onRemoveItem, cartItems, cardsPerRow = 5, descriptionFontSize = 16 }) {
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
    <div className="menu-scroll h-full min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${cardsPerRow}, minmax(0, 1fr))` }}
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAdd={onAddItem}
            onRemove={onRemoveItem}
            itemCount={getItemCount(product.id)}
            descriptionFontSize={descriptionFontSize}
          />
        ))}
      </div>
    </div>
  );
}