import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { NextRequest } from "next/server";

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Authentication required");
  }
  return session;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getSessionFromRequest(_req: NextRequest) {
  // For API routes that need session info
  return await getServerSession(authOptions);
}