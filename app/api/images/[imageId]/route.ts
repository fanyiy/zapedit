import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db, images } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { deleteFromR2 } from "@/lib/r2";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { imageId } = await params;

    // First, get the image to ensure it belongs to the user and get the R2 key
    const imageData = await db
      .select()
      .from(images)
      .where(
        and(
          eq(images.id, imageId),
          eq(images.userId, session.user.id)
        )
      )
      .limit(1);

    if (imageData.length === 0) {
      return NextResponse.json(
        { error: "Image not found or access denied" },
        { status: 404 }
      );
    }

    const image = imageData[0];

    // Delete from R2 storage
    try {
      await deleteFromR2(image.r2Key);
    } catch (r2Error) {
      console.error("Failed to delete from R2:", r2Error);
      // Continue with database deletion even if R2 deletion fails
      // We don't want to block the user from cleaning up their projects
    }

    // Delete from database (this will cascade delete all edit sessions)
    await db
      .delete(images)
      .where(
        and(
          eq(images.id, imageId),
          eq(images.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
} 