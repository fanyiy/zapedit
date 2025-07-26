"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";

export default function UserButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-muted"></div>
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="rounded-2xl bg-muted px-4 py-2 text-sm font-medium text-foreground border border-border shadow-sm hover:bg-muted/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors cursor-pointer"
      >
        Sign In
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center space-x-3">
        <Image
          className="h-8 w-8 rounded-full ring-1 ring-border"
          src={session.user?.image || '/default-avatar.png'}
          alt={session.user?.name || 'User'}
          width={32}
          height={32}
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {session.user?.name}
          </span>
          <button
            onClick={() => signOut()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}