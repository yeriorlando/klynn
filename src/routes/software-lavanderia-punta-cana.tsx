import { createFileRoute } from "@tanstack/react-router";
import { CityLanding } from "@/components/klynn/CityLanding";

export const Route = createFileRoute("/software-lavanderia-punta-cana")({
  head: () => ({
    meta: [
      { title: "Software para Lavanderías en Punta Cana y Bávaro — Klynn RD" },
      { 
        name: "description", 
        content: "Potencia tu lavandería en Punta Cana y Bávaro. Control de órdenes, delivery y caja para negocios en Cap Cana, Verón y Los Corales. ¡Pruébalo gratis!" 
      },
      {
        name: "keywords",
        content: "software lavanderia punta cana, sistema pos lavanderia bavaro, gestion lavanderia cap cana, lavanderias zona este rd"
      }
    ],
  }),
  component: () => (
    <CityLanding 
      city="Punta Cana"
      fullName="Punta Cana y Bávaro"
      sectors={["Bávaro", "Verón", "Cap Cana", "Los Corales", "El Cortecito", "Punta Cana Village", "Friusa"]}
      description="Lleva el control total de tu lavandería en el paraíso del Este. Klynn te permite gestionar repartidores y clientes en toda la zona turística con facilidad."
    />
  ),
});
