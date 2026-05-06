import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['he', 'en', 'fr', 'yi'];
const defaultLocale = 'he';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if the pathname is missing any locale
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // Redirect if there is no locale
  if (pathnameIsMissingLocale) {
    // Skip public files and api routes
    if (
      pathname.startsWith('/api') ||
      pathname.startsWith('/images') ||
      pathname.includes('.')
    ) {
      return;
    }

    return NextResponse.redirect(
      new URL(`/${defaultLocale}${pathname}`, request.url)
    );
  }
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    '/((?!_next|api|images|favicon.ico).*)',
  ],
};
