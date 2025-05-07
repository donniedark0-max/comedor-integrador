'use client';

import { Providers } from '../components/Providers';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  // Aquí montamos ClerkProvider solo para rutas /login
  return <Providers>{children}</Providers>;
}
