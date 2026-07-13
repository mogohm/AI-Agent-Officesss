"use client";
// App-wide client providers. TanStack Query is set up here for future use;
// current pages fetch directly via the api client, and can be migrated to
// useQuery incrementally without touching the tree.
import { useState, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000 } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
