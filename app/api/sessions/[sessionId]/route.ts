import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db, editSessions, images } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId } = await params;

    // Get session with image data
    const sessionData = await db
      .select({
        sessionId: editSessions.id,
        imageId: editSessions.imageId,
        prompt: editSessions.prompt,
        status: editSessions.status,
        resultUrl: editSessions.resultUrl,
        sessionCreatedAt: editSessions.createdAt,
        originalUrl: images.originalUrl,
        width: images.width,
        height: images.height,
      })
      .from(editSessions)
      .innerJoin(images, eq(editSessions.imageId, images.id))
      .where(
        and(
          eq(editSessions.id, sessionId),
          eq(editSessions.userId, session.user.id)
        )
      )
      .limit(1);

    if (sessionData.length === 0) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ session: sessionData[0] });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
} 