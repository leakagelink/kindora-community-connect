import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Reuse freshly loaded lists for 30s instead of refetching on every
        // navigation; mutations still invalidate immediately.
        staleTime: 30 * 1000,
        gcTime: 10 * 60 * 1000,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 30 * 1000,
  });

  return router;
};
