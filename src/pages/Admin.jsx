import { useState, useEffect } from "react";
import { api } from "@/api/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, ChevronLeft, ToggleLeft, ToggleRight } from "lucide-react";

const CATEGORIES = ["Pastéis Salgados", "Pastéis Doces", "Bebidas", "Adicionais"];

const emptyForm = {
  name: "",
  description: "",
  price: "",
  category: "",
  image_url: "",
  available: true,
};

export default function Admin() {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await api.products.list();
      setProducts(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Não foi possível carregar os produtos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (product) => {
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price?.toString() || "",
      category: product.category || "",
      image_url: product.image_url || "",
      available: product.available ?? true,
    });
    setEditingId(product.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category) {
      toast({ title: "Preencha nome, preço e categoria.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      price: parseFloat(form.price),
    };
    if (editingId) {
      await api.products.update(editingId, payload);
      toast({ title: "Produto atualizado!" });
    } else {
      await api.products.create(payload);
      toast({ title: "Produto criado!" });
    }
    setSaving(false);
    setDialogOpen(false);
    loadProducts();
  };

  const handleDelete = async (id) => {
    if (!confirm("Remover este produto?")) return;
    await api.products.remove(id);
    toast({ title: "Produto removido." });
    loadProducts();
  };

  const handleToggleAvailable = async (product) => {
    await api.products.update(product.id, { available: !product.available });
    loadProducts();
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = products.filter((p) => p.category === cat);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="font-inter text-sm">PDV</span>
          </a>
          <h1 className="font-inter font-bold text-xl text-foreground">Administração do Cardápio</h1>
        </div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" />
          Novo Produto
        </Button>
      </div>

      {/* Content */}
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          CATEGORIES.map((cat) => (
            <div key={cat}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="font-inter font-semibold text-lg text-foreground">{cat}</h2>
                <span className="text-sm text-muted-foreground">{grouped[cat].length} itens</span>
              </div>
              {grouped[cat].length === 0 ? (
                <p className="text-sm text-muted-foreground italic pl-2">Nenhum produto nesta categoria.</p>
              ) : (
                <div className="space-y-2">
                  {grouped[cat].map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3"
                    >
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-secondary shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-inter font-medium text-foreground truncate">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground truncate">{product.description}</p>
                        )}
                      </div>
                      <span className="font-inter font-semibold text-primary shrink-0">
                        R$ {product.price?.toFixed(2)}
                      </span>
                      <Badge
                        className={product.available
                          ? "bg-green-500/10 text-green-400 border-green-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"}
                      >
                        {product.available ? "Ativo" : "Inativo"}
                      </Badge>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleToggleAvailable(product)}
                          title={product.available ? "Desativar" : "Ativar"}
                        >
                          {product.available
                            ? <ToggleRight className="w-5 h-5 text-green-400" />
                            : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(product)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-inter font-bold text-foreground">
              {editingId ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-foreground">Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Pastel de Carne"
                className="mt-1 bg-secondary border-border"
              />
            </div>
            <div>
              <Label className="text-foreground">Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição opcional"
                className="mt-1 bg-secondary border-border"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-foreground">Preço (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0.00"
                  className="mt-1 bg-secondary border-border"
                />
              </div>
              <div className="flex-1">
                <Label className="text-foreground">Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1 bg-secondary border-border">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-foreground">URL da Imagem</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
                className="mt-1 bg-secondary border-border"
              />
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-foreground">Disponível</Label>
              <button
                type="button"
                onClick={() => setForm({ ...form, available: !form.available })}
              >
                {form.available
                  ? <ToggleRight className="w-8 h-8 text-green-400" />
                  : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
              </button>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}