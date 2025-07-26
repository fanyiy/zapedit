import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Add any custom middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow public access to auth pages and API routes
        if (req.nextUrl.pathname.startsWith('/auth/')) return true;
        if (req.nextUrl.pathname.startsWith('/api/auth/')) return true;
        
        // Require authentication for protected routes
        if (req.nextUrl.pathname.startsWith('/dashboard')) {
          return !!token;
        }
        
        // Allow public access to home page and API routes
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
};