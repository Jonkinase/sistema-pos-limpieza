'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { usePOSStore } from '@/lib/stores/posStore';
import { AuthUser } from '@/lib/auth';
import { Sucursal } from '@/lib/types';

interface ProvidersProps {
  children: React.ReactNode;
  initialUser: AuthUser | null;
  initialSucursales: Sucursal[];
}

export default function Providers({ children, initialUser, initialSucursales }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  const setSucursalSeleccionada = usePOSStore(state => state.setSucursalSeleccionada);

  // Initialize sucursal logic on mount (client-side only)
  useEffect(() => {
    if (initialUser && initialSucursales.length > 0) {
      if (initialUser.rol !== 'admin' && initialUser.sucursal_id) {
        setSucursalSeleccionada(initialUser.sucursal_id);
      } else {
        // Only set default if nothing is selected yet
        usePOSStore.getState().setSucursalSeleccionada(initialSucursales[0].id);
      }
    }
  }, [initialUser, initialSucursales, setSucursalSeleccionada]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
