"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

interface SampleImage {
  id: string;
  url: string;
  width: number;
  height: number;
  sortOrder: number;
  isActive: boolean;
}

export function SampleImages({
  onSelect,
  onAuthRequired,
}: {
  onSelect: ({
    url,
    width,
    height,
  }: {
    url: string;
    width: number;
    height: number;
  }) => void;
  onAuthRequired?: () => boolean;
}) {
  const [sampleImages, setSampleImages] = useState<SampleImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSampleImages() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/sample-images');
        
        if (!response.ok) {
          throw new Error('Failed to fetch sample images');
        }
        
        const images = await response.json();
        setSampleImages(images);
      } catch (err) {
        console.error('Error fetching sample images:', err);
        setError('Failed to load sample images');
        
        // Fallback to hardcoded images if API fails
        setSampleImages([
          {
            id: "fallback-1",
            url: "https://resources.modelscope.cn/aigc/image_edit.png",
            width: 892,
            height: 892,
            sortOrder: 0,
            isActive: true,
          },
          {
            id: "fallback-2",
            url: "https://i.ibb.co/LdNQT9r4/image.png",
            width: 1012,
            height: 674,
            sortOrder: 1,
            isActive: true,
          },
          {
            id: "fallback-3",
            url: "https://images.unsplash.com/photo-1751210392423-d8988823cb6d?q=80&w=1335&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            width: 669,
            height: 892,
            sortOrder: 2,
            isActive: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSampleImages();
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Sample images
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Or try one of these examples
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className="aspect-[4/3] w-full rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error && sampleImages.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white mb-2">
            Sample images
          </h3>
          <p className="text-muted-foreground text-sm text-red-400">
            Failed to load sample images. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Sample images
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Or try one of these examples
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {sampleImages.map((sample, index) => (
          <button
            key={sample.id}
            className="group relative overflow-hidden rounded-xl hover:ring-2 hover:ring-muted-foreground transition-all duration-200 hover:scale-[1.02] cursor-pointer"
            onClick={() => {
              // Check authentication before selecting image
              if (onAuthRequired && !onAuthRequired()) {
                return; // Authentication required, don't proceed
              }
              
              onSelect({
                url: sample.url,
                width: sample.width,
                height: sample.height,
              });
            }}
          >
            <Image
              src={sample.url}
              width={sample.width}
              height={sample.height}
              alt={`Sample image ${index + 1}`}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <p className="text-white text-sm font-medium">
                Use this image
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}