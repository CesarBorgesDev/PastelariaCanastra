import { cn } from "@/lib/utils";

const categories = [
  { id: "all", label: "Todos", icon: "🍽️" },
  { id: "Pastéis Salgados", label: "Salgados", icon: "🥟" },
  { id: "Pastéis Doces", label: "Doces", icon: "🍫" },
  { id: "Bebidas", label: "Bebidas", icon: "🥤" },
  { id: "Adicionais", label: "Adicionais", icon: "➕" },
];

export default function CategoryTabs({ activeCategory, onCategoryChange }) {
  return (
    <div className="flex gap-2 px-6 py-3 overflow-x-auto no-scrollbar">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
          className={cn(
            "flex items-center gap-2 px-5 py-3 rounded-xl font-inter text-sm font-semibold transition-all whitespace-nowrap",
            "active:scale-95",
            activeCategory === cat.id
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          )}
        >
          <span className="text-lg">{cat.icon}</span>
          {cat.label}
        </button>
      ))}
    </div>
  );
}