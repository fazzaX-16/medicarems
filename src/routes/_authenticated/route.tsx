import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { enforceRememberMe } from "@/lib/remember";

// Login gate: every hospital page lives under this layout.
// The database itself also refuses data to anyone not signed in.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    await enforceRememberMe();
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } });
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});
