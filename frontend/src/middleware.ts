import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export default clerkMiddleware(async (auth, req) => {
  // Sólo bloquea rutas que empiecen por /admin
  const authObj = await auth();
  if (req.nextUrl.pathname.startsWith('/admin') && !authObj.userId) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*'],  // Aplica middleware únicamente a /admin/*
};