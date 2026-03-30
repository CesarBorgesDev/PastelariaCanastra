import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProductCard({ product, onAdd, onRemove, itemCount }) {
  const handleAdd = (e) => {
    e.stopPropagation();
    onAdd(product);
  };
  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) onRemove(product.id);
  };

  return (
    <button
      onClick={handleAdd}
      className={cn(
        "relative group bg-card border border-border rounded-2xl overflow-hidden",
        "transition-all duration-200 active:scale-[0.97]",
        "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10",
        "text-left w-full",
        itemCount > 0 && "border-primary/60 shadow-md shadow-primary/10"
      )}
    >
      {/* Badge de quantidade */}
      {itemCount > 0 && (
        <div className="absolute top-3 right-3 z-10 bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-inter animate-pop-in">
          {itemCount}
        </div>
      )}

      {/* Imagem */}
      <div className="aspect-[4/3] overflow-hidden bg-secondary">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🥟
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-inter font-bold text-foreground text-base leading-tight">
          {product.name}
        </h3>
        {product.description && (
          <p className="font-inter text-xs text-muted-foreground mt-1 line-clamp-1">
            {product.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="font-inter font-extrabold text-primary text-lg">
            R$ {product.price?.toFixed(2)}
          </span>
          <div className="flex items-center gap-1">
            {itemCount > 0 && (
              <button onClick={handleRemove} className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center active:scale-90 transition-transform">
                <Minus className="w-4 h-4 text-foreground" />
              </button>
            )}
            <button onClick={handleAdd} className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors active:scale-90">
              <Plus className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>
      </div>
    </button>
  );
}