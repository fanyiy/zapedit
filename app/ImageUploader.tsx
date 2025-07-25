import clsx from "clsx";
import { useRef, useState, useTransition } from "react";
import Spinner from "./Spinner";

export function ImageUploader({
  onUpload,
}: {
  onUpload: ({
    url,
    width,
    height,
  }: {
    url: string;
    width: number;
    height: number;
  }) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleUpload(file: File) {
    startTransition(async () => {
      // Convert file to base64 data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        
        // Create an image element to get dimensions
        const img = new Image();
        img.onload = () => {
          onUpload({
            url: dataUrl,
            width: img.width,
            height: img.height,
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
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
        "relative flex aspect-[3/2] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200",
        isDragging
          ? "border-white bg-white/5 scale-[1.02]"
          : "border-border hover:border-muted-foreground hover:bg-muted/20",
        pending && "pointer-events-none opacity-50"
      )}
    >
      {!pending ? (
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted border border-border">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-white mb-3">
            Drop your image here
          </h3>
          <p className="text-muted-foreground text-base mb-6">
            or click to browse files
          </p>
          <div className="inline-flex items-center gap-2 rounded-xl bg-white text-black px-6 py-3 text-sm font-medium transition-all hover:bg-gray-200 hover:scale-105">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Choose File
          </div>
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