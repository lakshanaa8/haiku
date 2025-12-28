import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useCalls() {
  return useQuery({
    queryKey: [api.calls.list.path],
    queryFn: async () => {
      const res = await fetch(api.calls.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch calls");
      return api.calls.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Poll every 5s for real-time status updates
  });
}
