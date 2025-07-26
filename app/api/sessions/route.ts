import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db, editSessions, images } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get user's editing sessions with image data
    const userSessions = await db
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
        imageCreatedAt: images.createdAt,
      })
      .from(editSessions)
      .innerJoin(images, eq(editSessions.imageId, images.id))
      .where(eq(editSessions.userId, session.user.id))
      .orderBy(desc(editSessions.createdAt));

    // Group sessions by image/project
    const sessionsByImage = userSessions.reduce((acc, session) => {
      const imageId = session.imageId;
      
      if (!acc[imageId]) {
        acc[imageId] = {
          imageId,
          originalUrl: session.originalUrl,
          width: session.width,
          height: session.height,
          imageCreatedAt: session.imageCreatedAt,
          lastEditedAt: session.sessionCreatedAt,
          latestEdit: null,
          sessions: []
        };
      }

      acc[imageId].sessions.push({
        id: session.sessionId,
        prompt: session.prompt,
        status: session.status,
        resultUrl: session.resultUrl,
        createdAt: session.sessionCreatedAt,
      });
      
      // Update latest edit info (only for completed sessions with results)
      if (session.status === 'completed' && session.resultUrl && 
          (!acc[imageId].latestEdit || session.sessionCreatedAt > acc[imageId].latestEdit.createdAt)) {
        acc[imageId].latestEdit = {
          prompt: session.prompt,
          resultUrl: session.resultUrl,
          createdAt: session.sessionCreatedAt,
        };
        acc[imageId].lastEditedAt = session.sessionCreatedAt;
      }

      return acc;
    }, {} as Record<string, any>);

    // Calculate editCount separately for each project by counting unique completed sessions
    Object.values(sessionsByImage).forEach((project: any) => {
      const completedSessions = project.sessions.filter((session: any) => 
        session.status === 'completed' && session.resultUrl
      );
      
      // Remove duplicates based on resultUrl to get unique edits
      const uniqueCompletedSessions = completedSessions.filter((session: any, index: number, array: any[]) => 
        array.findIndex(s => s.resultUrl === session.resultUrl) === index
      );
      
      project.editCount = uniqueCompletedSessions.length;
    });

    // Convert to array and sort by last edited date
    const projects = Object.values(sessionsByImage).sort(
      (a: any, b: any) => new Date(b.lastEditedAt).getTime() - new Date(a.lastEditedAt).getTime()
    );

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { imageId, prompt, status, resultUrl } = await request.json();

    if (!imageId || !prompt || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the image belongs to the user
    const image = await db
      .select()
      .from(images)
      .where(and(eq(images.id, imageId), eq(images.userId, session.user.id)))
      .limit(1);

    if (image.length === 0) {
      return NextResponse.json(
        { error: "Image not found or access denied" },
        { status: 404 }
      );
    }

    // Create new edit session
    const [newSession] = await db
      .insert(editSessions)
      .values({
        userId: session.user.id,
        imageId,
        prompt,
        status,
        resultUrl,
      })
      .returning();

    return NextResponse.json({ 
      sessionId: newSession.id,
      success: true 
    });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
} 