"use client";

import { useSession } from "next-auth/react";
import { SignupModal } from "./SignupModal";

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { data: session, status } = useSession();

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  // Show signup modal if not authenticated
  if (!session) {
    return <SignupModal />;
  }

  // Render the main app content if authenticated
  return <>{children}</>;
} 