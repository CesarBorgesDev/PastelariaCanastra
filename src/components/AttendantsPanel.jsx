import { useEffect, useState } from "react";
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
import { Pencil, Plus, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

export default function AttendantsPanel() {
  const { toast } = useToast();
  const [attendants, setAttendants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setAttendants(await api.attendants.list());
    } catch (error) {
      toast({ title: "Não foi possível carregar os atendentes.", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setName("");
    setDialogOpen(true);
  };

  const openEdit = (attendant) => {
    setEditing(attendant);
    setName(attendant.name);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "Informe o nome do atendente.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.attendants.update(editing.id, { name: trimmed });
        toast({ title: "Atendente atualizado!" });
      } else {
        await api.attendants.create({ name: trimmed });
        toast({ title: "Atendente criado!" });
      }
      setDialogOpen(false);
      await load();
    } catch (error) {
      toast({ title: "Não foi possível salvar.", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (attendant) => {
    try {
      await api.attendants.update(attendant.id, { active: !attendant.active });
      await load();
    } catch (error) {
      toast({ title: "Não foi possível atualizar.", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (attendant) => {
    if (!confirm(`Remover ${attendant.name}?`)) return;
    try {
      await api.attendants.remove(attendant.id);
      toast({ title: "Atendente removido." });
      await load();
    } catch (error) {
      toast({ title: "Não foi possível remover.", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{attendants.length} atendentes</p>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" />
          Novo atendente
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {attendants.map((attendant) => (
            <div
              key={attendant.id}
              className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3"
            >
              <p className="flex-1 font-inter font-medium text-foreground">{attendant.name}</p>
              <Badge
                className={attendant.active
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"}
              >
                {attendant.active ? "Ativo" : "Inativo"}
              </Badge>
              <Button size="icon" variant="ghost" onClick={() => handleToggle(attendant)} title={attendant.active ? "Desativar" : "Ativar"}>
                {attendant.active
                  ? <ToggleRight className="w-5 h-5 text-green-400" />
                  : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => openEdit(attendant)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(attendant)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-inter font-bold text-foreground">
              {editing ? "Editar atendente" : "Novo atendente"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-foreground">Nome</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 bg-secondary border-border"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancelar</Button>
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
