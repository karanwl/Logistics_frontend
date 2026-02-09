import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export type CurrentUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
};

export const useCurrentUser = (enabled = true) =>
  useQuery({
    queryKey: ["current-user"],
    queryFn: () => api.get<{ user: CurrentUser }>("/me"),
    enabled,
    staleTime: 30000
  });
