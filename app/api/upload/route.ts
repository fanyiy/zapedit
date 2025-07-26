import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { uploadToR2, generateImageKey } from "@/lib/r2";
import { db, images } from "@/lib/db";
import sharp from "sharp";

// Configure route to handle large files
export const maxDuration = 300; // 5 minutes for large file processing

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image." },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 413 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique key for R2
    const r2Key = generateImageKey(session.user.id, file.name);
    
    // Upload to R2
    const imageUrl = await uploadToR2(r2Key, buffer, file.type);

    // Get image dimensions using Sharp
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Save to database
    const [savedImage] = await db.insert(images).values({
      userId: session.user.id,
      originalUrl: imageUrl,
      r2Key: r2Key,
      width: width,
      height: height,
    }).returning();

    return NextResponse.json({
      id: savedImage.id,
      url: imageUrl,
      width: width,
      height: height,
    });
  } catch (error) {
    console.error("Upload error:", error);
    
    // Handle specific error types
    if (error instanceof Error) {
      // Handle body size limit errors
      if (error.message.includes("Body exceeded") || error.message.includes("body size")) {
        return NextResponse.json(
          { error: "File too large. Please upload an image smaller than 10MB." },
          { status: 413 }
        );
      }
      
      // Handle other specific errors
      if (error.message.includes("timeout")) {
        return NextResponse.json(
          { error: "Upload timeout. Please try again with a smaller image." },
          { status: 408 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to upload image. Please try again." },
      { status: 500 }
    );
  }
}