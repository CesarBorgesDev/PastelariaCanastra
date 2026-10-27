import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LIMITS, loadSettings, saveSettings } from "@/lib/settings";

export default function SettingsDialog({ open, onClose, onSaved }) {
  const [form, setForm] = useState(loadSettings);

  useEffect(() => {
    if (open) setForm(loadSettings());
  }, [open]);

  const save = () => {
    const saved = saveSettings({
      ...form,
      printerPort: form.printerPort === "" ? LIMITS.printerPortDefault : form.printerPort,
    });
    onSaved(saved);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-inter">
            <Settings className="w-5 h-5" />
            Configuração
          </DialogTitle>
          <DialogDescription>As opções ficam salvas neste navegador.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="font-inter font-bold text-sm">Backend</h3>
            <Label htmlFor="backend-url">Endereço</Label>
            <Input
              id="backend-url"
              value={form.backendUrl}
              placeholder="http://192.168.0.10"
              onChange={(event) => setForm({ ...form, backendUrl: event.target.value })}
            />
          </section>

          <section className="space-y-3">
            <h3 className="font-inter font-bold text-sm">Cardápio</h3>
            <div>
              <p className="font-inter font-bold text-sm">Produtos por linha: {form.cardsPerRow}</p>
              <Slider
                value={[form.cardsPerRow]}
                min={LIMITS.cardsPerRowMin}
                max={LIMITS.cardsPerRowMax}
                step={1}
                onValueChange={([value]) => setForm({ ...form, cardsPerRow: value })}
              />
            </div>
            <div>
              <p className="font-inter font-bold text-sm">Tamanho da descrição: {form.descriptionFontSize}</p>
              <Slider
                value={[form.descriptionFontSize]}
                min={LIMITS.descriptionFontSizeMin}
                max={LIMITS.descriptionFontSizeMax}
                step={1}
                onValueChange={([value]) => setForm({ ...form, descriptionFontSize: value })}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-inter font-bold text-sm">Impressora Control iD</h3>
            <div className="space-y-2">
              <Label htmlFor="printer-ip">IP</Label>
              <Input
                id="printer-ip"
                value={form.printerIp}
                placeholder="192.168.0.128"
                onChange={(event) => setForm({ ...form, printerIp: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="printer-port">Porta</Label>
              <Input
                id="printer-port"
                inputMode="numeric"
                value={form.printerPort}
                onChange={(event) => setForm({ ...form, printerPort: event.target.value.replace(/\D/g, "") })}
              />
              <p className="text-xs text-muted-foreground">Print iD usa 9100 (ESC/POS).</p>
            </div>
            <div>
              <p className="font-inter font-bold text-sm">Tamanho da fonte: {form.printFontSize}</p>
              <Slider
                value={[Number(form.printFontSize)]}
                min={LIMITS.printFontSizeMin}
                max={LIMITS.printFontSizeMax}
                step={1}
                onValueChange={([value]) => setForm({ ...form, printFontSize: value })}
              />
              <p className="text-xs text-muted-foreground">
                Vale para os itens do cupom. O número da comanda sai sempre em letras grandes.
              </p>
            </div>
          </section>

          <Button onClick={save} className="w-full font-inter font-bold">
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
