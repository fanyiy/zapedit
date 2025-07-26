"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

const errors: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The verification link was invalid or has expired.",
  Default: "Unable to sign in.",
};

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorMessage = errors[error || "Default"];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
            Authentication Error
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {errorMessage}
          </p>
        </div>
        <div className="mt-8">
          <Link
            href="/auth/signin"
            className="group relative flex w-full justify-center rounded-xl bg-card py-3 px-4 text-sm font-medium text-foreground border border-border shadow-sm hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
          >
            Try Again
          </Link>
        </div>
      </div>
    </div>
  );
}