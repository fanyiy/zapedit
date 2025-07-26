import { NextResponse } from 'next/server';
import { db, sampleImages } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  try {
    const samples = await db
      .select()
      .from(sampleImages)
      .where(eq(sampleImages.isActive, true))
      .orderBy(asc(sampleImages.sortOrder), asc(sampleImages.createdAt));

    return NextResponse.json(samples);
  } catch (error) {
    console.error('Error fetching sample images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sample images' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { url, width, height, sortOrder } = await request.json();

    if (!url || !width || !height) {
      return NextResponse.json(
        { error: 'URL, width, and height are required' },
        { status: 400 }
      );
    }

    const newSampleImage = await db
      .insert(sampleImages)
      .values({
        url,
        width,
        height,
        sortOrder: sortOrder || 0,
      })
      .returning();

    return NextResponse.json(newSampleImage[0], { status: 201 });
  } catch (error) {
    console.error('Error creating sample image:', error);
    return NextResponse.json(
      { error: 'Failed to create sample image' },
      { status: 500 }
    );
  }
} 