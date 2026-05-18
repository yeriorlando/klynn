import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rocket, ShieldAlert, Users, Package } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Tenant } from "@/lib/storage";

interface PlanLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "orders" | "employees";
  limit: number | null;
  tenant: Tenant;
}

export function PlanLimitModal({ open, onOpenChange, type, limit, tenant }: PlanLimitModalProps) {
  const navigate = useNavigate();

  const isOrders = type === "orders";
  const Icon = isOrders ? Package : Users;
  const title = isOrders ? "Límite de órdenes alcanzado" : "Límite de personal alcanzado";
  const description = isOrders 
    ? `Tu plan actual permite un máximo de ${limit} órdenes al mes. Para seguir recibiendo pedidos, necesitas cambiar de Plan.`
    : `Tu plan actual permite un máximo de ${limit} empleados. Para añadir más personal, actualiza tu suscripción.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
        <div className="bg-gradient-primary p-8 text-white text-center relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Rocket className="h-24 w-24 rotate-12" />
          </div>
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm ring-1 ring-white/30">
            <ShieldAlert className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-display mb-2">{title}</DialogTitle>
          <p className="text-white/80 text-sm">{description}</p>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-accent/30 border border-border">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Tu capacidad actual</div>
              <div className="text-lg font-display font-bold">{limit} {isOrders ? "órdenes/mes" : "empleados"}</div>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full h-12 rounded-xl font-bold text-lg bg-gradient-primary shadow-elegant"
              onClick={() => {
                onOpenChange(false);
                navigate({ to: "/t/$slug/configuracion", params: { slug: tenant.slug }, search: { tab: "plan" } as any });
              }}
            >
              🚀 Cambiar de Plan ahora
            </Button>
            <Button 
              variant="ghost" 
              className="w-full h-11 rounded-xl text-muted-foreground"
              onClick={() => onOpenChange(false)}
            >
              Tal vez más tarde
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
