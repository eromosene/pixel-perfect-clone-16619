import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth.functions";

export const currentUserQueryOptions = queryOptions({
  queryKey: ["current-user"],
  queryFn: () => getCurrentUser(),
  staleTime: 60_000,
  retry: 3,
  retryDelay: 500,
});

export function useCurrentUser() {
  return useSuspenseQuery(currentUserQueryOptions);
}
