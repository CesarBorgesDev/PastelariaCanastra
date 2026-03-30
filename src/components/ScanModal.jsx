import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScanBarcode, CheckCircle2, Printer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ScanModal({ open, onClose, onConfirm, orderNumber }) {
  const [phase, setPhase] = useState("scanning"); // scanning | scanned | printing | done
  const [barcode, setBarcode] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPhase("scanning");
      setBarcode("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const playBeep = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1800;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  };

  const handleScan = () => {
    playBeep();
    setPhase("scanned");

    setTimeout(() => {
      setPhase("printing");
    }, 1000);

    setTimeout(() => {
      setPhase("done");
    }, 2500);

    setTimeout(() => {
      onConfirm();
    }, 3500);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && barcode.length > 0) {
      handleScan();
    }
  };

  const handleSimulateScan = () => {
    const fakeBarcode = `CMD-${orderNumber}-${Date.now().toString().slice(-6)}`;
    setBarcode(fakeBarcode);
    handleScan();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md p-0 overflow-hidden">
        <div className="p-8 flex flex-col items-center text-center">
          <AnimatePresence mode="wait">
            {phase === "scanning" && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-6"
              >
                <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
                  <ScanBarcode className="w-12 h-12 text-primary animate-pulse" />
                </div>
                <div>
                  <h3 className="font-inter font-bold text-xl text-foreground">
                    Bipar Comanda
                  </h3>
                  <p className="font-inter text-sm text-muted-foreground mt-2">
                    Aproxime o leitor de código de barras ou toque no botão abaixo para simular
                  </p>
                </div>

                {/* Hidden input for barcode scanner */}
                <input
                  ref={inputRef}
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="opacity-0 absolute"
                  autoFocus
                />

                <button
                  onClick={handleSimulateScan}
                  className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-inter font-bold text-base active:scale-[0.98] transition-transform"
                >
                  📱 Simular Leitura
                </button>
              </motion.div>
            )}

            {phase === "scanned" && (
              <motion.div
                key="scanned"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 10 }}
                  className="w-24 h-24 rounded-3xl bg-green-500/10 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </motion.div>
                <h3 className="font-inter font-bold text-xl text-foreground">
                  Comanda Lida!
                </h3>
                <p className="font-inter text-sm text-muted-foreground">
                  Pedido #{orderNumber}
                </p>
              </motion.div>
            )}

            {phase === "printing" && (
              <motion.div
                key="printing"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
                  <Printer className="w-12 h-12 text-primary animate-pulse" />
                </div>
                <h3 className="font-inter font-bold text-xl text-foreground">
                  Imprimindo...
                </h3>
                <p className="font-inter text-sm text-muted-foreground">
                  Enviando para impressora térmica
                </p>
                <div className="w-48 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </motion.div>
            )}

            {phase === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 8 }}
                  className="w-24 h-24 rounded-3xl bg-green-500/10 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </motion.div>
                <h3 className="font-inter font-bold text-xl text-foreground">
                  Pedido Enviado!
                </h3>
                <p className="font-inter text-sm text-muted-foreground">
                  Comanda impressa com sucesso
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}