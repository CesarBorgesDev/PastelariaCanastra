import { Clock, User } from "lucide-react";
import { useState, useEffect } from "react";

export default function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-card border-b border-border">
      <div className="flex items-center gap-4">
        <img
          src="https://media.base44.com/images/public/user_691489324af99e2dfcd3ecc0/31a86f752_PastelariaCanastradesde1979.png"
          alt="Pastelaria Canastra"
          className="h-12 object-contain"
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span className="font-inter text-sm font-medium tabular-nums">
            {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
          <User className="w-4 h-4 text-primary" />
          <span className="font-inter text-sm font-medium text-foreground">Atendente</span>
        </div>
      </div>
    </header>
  );
}