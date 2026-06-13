import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { currentUserQueryOptions } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context: { queryClient } }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });

    // Pre-warm the current-user cache while the session is confirmed valid.
    // This guarantees useSuspenseQuery in child routes always finds cached data
    // and never triggers a cold fetch where the auth lock may still be busy.
    await queryClient.ensureQueryData(currentUserQueryOptions);

    return { user: data.session.user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
