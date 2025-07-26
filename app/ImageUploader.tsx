"use client";

import clsx from "clsx";
import { useRef, useState, useTransition } from "react";
import Spinner from "./Spinner";

interface ImageUploaderProps {
  onUpload: (data: {
    id: string;
    url: string;
    width: number;
    height: number;
  }) => void;
}

export function ImageUploader({ onUpload }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleUpload(file: File) {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error("Upload failed");
        }
        
        const result = await response.json();
        onUpload(result);
      } catch (error) {
        console.error("Upload error:", error);
        // Fallback to data URL for local processing
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          
          const img = new Image();
          img.onload = () => {
            onUpload({
              id: "", // No ID for fallback
              url: dataUrl,
              width: img.width,
              height: img.height,
            });
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  return (
    <button
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const data = e.dataTransfer;
        const file = data?.files?.[0];
        if (file) {
          handleUpload(file);
        }
      }}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => {
        setIsDragging(false);
      }}
      onClick={() => {
        fileInputRef.current?.click();
      }}
      className={clsx(
        "relative flex aspect-[5/2] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200",
        isDragging
          ? "border-white bg-white/5 scale-[1.02]"
          : "border-border hover:border-muted-foreground hover:bg-muted/20",
        pending && "pointer-events-none opacity-50"
      )}
    >
      {!pending ? (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted border border-border">
            <svg className="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            Drop your image here
          </h3>
          <p className="text-muted-foreground text-sm">
            or click to browse files
          </p>
        </div>
      ) : (
        <div className="text-center">
          <Spinner className="mb-4" />
          <p className="text-white text-lg">Processing image...</p>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleUpload(file);
          }
        }}
        ref={fileInputRef}
      />
    </button>
  );
}