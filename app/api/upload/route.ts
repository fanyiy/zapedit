import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { uploadToR2, generateImageKey } from "@/lib/r2";
import { db, images } from "@/lib/db";
import sharp from "sharp";

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
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}