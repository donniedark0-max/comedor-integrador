// src/app/components/Providers.tsx
'use client';
import { ClerkProvider } from '@clerk/nextjs';
import { esES } from '@clerk/localizations';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={esES}>
      {children}
    </ClerkProvider>
  );
}
