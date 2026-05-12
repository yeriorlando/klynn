import { createFileRoute } from "@tanstack/react-router";
import { CityLanding } from "@/components/klynn/CityLanding";

export const Route = createFileRoute("/software-lavanderia-santiago")({
  head: () => ({
    meta: [
      { title: "Software para Lavanderías en Santiago — Klynn RD" },
      { 
        name: "description", 
        content: "El software #1 para lavanderías en Santiago de los Caballeros. Gestiona tu negocio en Los Jardines, Gurabo y Villa Olga con NCF, ITBIS y WhatsApp." 
      },
      {
        name: "keywords",
        content: "software lavanderia santiago, sistema pos lavanderia santiago, lavanderias santiago de los caballeros, gestion lavanderia santiago"
      }
    ],
  }),
  component: () => (
    <CityLanding 
      city="Santiago"
      fullName="Santiago de los Caballeros"
      sectors={["Los Jardines", "Gurabo", "Villa Olga", "El Embrujo", "Canabacoa", "Cerros de Gurabo", "La Trinitaria"]}
      description="Optimiza tu lavandería en la Ciudad Corazón. Klynn es la plataforma más moderna para controlar tus órdenes, caja y repartidores en Santiago."
    />
  ),
});
