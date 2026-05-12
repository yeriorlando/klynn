import { createFileRoute } from "@tanstack/react-router";
import { CityLanding } from "@/components/klynn/CityLanding";

export const Route = createFileRoute("/software-lavanderia-santo-domingo")({
  head: () => ({
    meta: [
      { title: "Software para Lavanderías en Santo Domingo — Klynn RD" },
      { 
        name: "description", 
        content: "El sistema POS líder para lavanderías en el Distrito Nacional. Facturación NCF, control de caja y repartidores en Naco, Piantini, Bella Vista y más." 
      },
      {
        name: "keywords",
        content: "software lavanderia santo domingo, sistema pos lavanderia distrito nacional, gestion lavanderia naco piantini, lavanderias dominicanas"
      }
    ],
  }),
  component: () => (
    <CityLanding 
      city="Santo Domingo"
      fullName="Santo Domingo"
      sectors={["Naco", "Piantini", "Bella Vista", "Arroyo Hondo", "Gazcue", "Evaristo Morales", "Los Cacicazgos", "Mirador Sur"]}
      description="Moderniza tu operación en la capital dominicana. Klynn es la plataforma preferida por las lavanderías de Santo Domingo para crecer ordenadas y cobrar mejor."
    />
  ),
});
