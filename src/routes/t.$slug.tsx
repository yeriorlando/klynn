import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getTenantBySlug } from "@/lib/storage";
import { TenantShell } from "@/components/klynn/TenantShell";

export const Route = createFileRoute("/t/$slug")({
  beforeLoad: ({ params }) => {
    return { slug: params.slug };
  },
  component: TenantLayout,
});

function TenantLayout() {
  return (
    <TenantShell />
  );
}
