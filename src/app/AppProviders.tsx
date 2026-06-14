import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Setup QueryClient with standard configurations: cache-first and clean retry policies
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes of cache
      refetchOnWindowFocus: false, // Prevents aggressive background flashing
      retry: 2 // automatic retries on transient network errors
    }
  }
});

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
export default AppProviders;
