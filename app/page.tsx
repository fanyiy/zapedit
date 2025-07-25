"use client";

import Image, { getImageProps } from "next/image";
import { useRef, useState, useTransition, useEffect, useCallback } from "react";
import { generateImage } from "./actions";
import { ImageUploader } from "./ImageUploader";
import { Fieldset } from "./Fieldset";
import Spinner from "./Spinner";
import ScanningEffect from "./ScanningEffect";
import { preloadNextImage } from "@/lib/preload-next-image";
import clsx from "clsx";
import { SampleImages } from "./SampleImages";
import { DownloadIcon } from "./components/DownloadIcon";
import { toast } from "sonner";
import { SuggestedPrompts } from "./suggested-prompts/SuggestedPrompts";
import { flushSync } from "react-dom";
import { ChatInterface } from "./ChatInterface";

type Image = {
  url: string;
  prompt?: string;
  version: number;
};

export default function Home() {
  const [images, setImages] = useState<Image[]>([]);
  const [imageData, setImageData] = useState<{
    width: number;
    height: number;
  }>({ width: 1024, height: 768 });
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const activeImage = images.find((i) => i.url === activeImageUrl);


  useEffect(() => {
    function handleNewSession() {
      setImages([]);
      setActiveImageUrl(null);
    }
    window.addEventListener("new-image-session", handleNewSession);
    return () => {
      window.removeEventListener("new-image-session", handleNewSession);
    };
  }, []);

  const navigateToPreviousVersion = useCallback(async () => {
    if (!activeImage || images.length <= 1 || imageLoading) return;
    const currentIndex = images.findIndex(img => img.url === activeImageUrl);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    const targetImage = images[prevIndex];
    
    setImageLoading(true);
    await preloadNextImage({
      src: targetImage.url,
      width: imageData.width,
      height: imageData.height,
    });
    setActiveImageUrl(targetImage.url);
    setImageLoading(false);
  }, [activeImage, images, imageLoading, activeImageUrl, imageData]);

  const navigateToNextVersion = useCallback(async () => {
    if (!activeImage || images.length <= 1 || imageLoading) return;
    const currentIndex = images.findIndex(img => img.url === activeImageUrl);
    const nextIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    const targetImage = images[nextIndex];
    
    setImageLoading(true);
    await preloadNextImage({
      src: targetImage.url,
      width: imageData.width,
      height: imageData.height,
    });
    setActiveImageUrl(targetImage.url);
    setImageLoading(false);
  }, [activeImage, images, imageLoading, activeImageUrl, imageData]);

  const handleDownload = useCallback(async () => {
    if (!activeImage) return;

    try {
      const imageProps = getImageProps({
        src: activeImage.url,
        alt: "Generated image",
        height: imageData.height,
        width: imageData.width,
        quality: 100,
      });

      // Fetch the image
      const response = await fetch(imageProps.props.src);
      const blob = await response.blob();

      const extension = blob.type.includes("jpeg")
        ? "jpg"
        : blob.type.includes("png")
          ? "png"
          : blob.type.includes("webp")
            ? "webp"
            : "bin";

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `image-v${activeImage.version}.${extension}`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Image downloaded successfully!");
    } catch {
      toast.error("Failed to download image");
    }
  }, [activeImage, imageData]);

  // Touch/swipe handling for mobile
  useEffect(() => {
    if (!activeImage || images.length <= 1) return;

    const container = imageContainerRef.current;
    if (!container) return;

    let startX = 0;
    let startTime = 0;
    const threshold = 50; // minimum distance for swipe
    const timeThreshold = 300; // maximum time for swipe

    function handleTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX;
      startTime = Date.now();
    }

    function handleTouchEnd(e: TouchEvent) {
      const endX = e.changedTouches[0].clientX;
      const endTime = Date.now();
      const deltaX = endX - startX;
      const deltaTime = endTime - startTime;

      if (deltaTime > timeThreshold) return;

      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          // Swipe right - previous version
          navigateToPreviousVersion();
        } else {
          // Swipe left - next version
          navigateToNextVersion();
        }
      }
    }

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeImage, images, navigateToPreviousVersion, navigateToNextVersion]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger shortcuts when typing in input
      if (e.target instanceof HTMLInputElement) {
        if (e.key === "Escape") {
          setPrompt("");
          (e.target as HTMLInputElement).blur();
        }
        return;
      }

      if (!activeImage) return;

      switch (e.key) {
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          navigateToPreviousVersion();
          break;
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          navigateToNextVersion();
          break;
        case "d":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            handleDownload();
          }
          break;
        case "/":
          e.preventDefault();
          document.querySelector<HTMLInputElement>('input[name="prompt"]')?.focus();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImage, images, navigateToPreviousVersion, navigateToNextVersion, handleDownload]);



  function handleDeleteVersion(imageUrl: string) {
    const updatedImages = images.filter(img => img.url !== imageUrl);
    setImages(updatedImages);
    
    // If we deleted the active image, switch to the most recent one
    if (activeImageUrl === imageUrl) {
      if (updatedImages.length > 0) {
        setActiveImageUrl(updatedImages[updatedImages.length - 1].url);
      } else {
        setActiveImageUrl(null);
      }
    }
  }





  return (
    <>
      <div className={clsx(
        "flex",
        activeImage ? "h-screen" : "min-h-screen"
      )}>
        <div className={clsx(
          "flex flex-col",
          activeImage ? "flex-1 h-screen" : "flex-1 min-h-screen mx-auto max-w-6xl"
        )}>
          <div className={clsx(
            "flex gap-8 px-6 md:px-8 md:flex-row",
            activeImage ? "flex-1 py-6 overflow-hidden" : "flex-col pt-16 pb-12 md:pt-24"
          )}>
          <div
            ref={scrollRef}
            className="flex shrink-0 snap-x scroll-pl-4 gap-4 p-2 max-md:order-2 max-md:-mx-4 max-md:overflow-x-auto max-md:px-6 md:w-40 md:flex-col md:overflow-y-scroll hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {images
              .slice()
              .reverse()
              .map((image, index) => (
                <div
                  className="flex shrink-0 snap-start items-center gap-3 p-0.5"
                  key={`img-${image.version}-${index}-${image.url.slice(-10)}`}
                >
                  <span
                    className={clsx(
                      activeImageUrl === image.url
                        ? "text-white"
                        : "text-muted-foreground",
                      "w-4 shrink-0 font-mono text-xs max-md:hidden",
                    )}
                  >
                    v{image.version}
                  </span>
                  <div className="relative group">
                    <button
                      className={clsx(
                        activeImageUrl === image.url
                          ? "ring-2 ring-white max-md:border-white"
                          : "max-md:border-transparent hover:ring-1 hover:ring-muted-foreground",
                        "cursor-pointer overflow-hidden rounded-xl focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-white max-md:border transition-all duration-200",
                      )}
                      onClick={async () => {
                        if (activeImageUrl === image.url || imageLoading) return;
                        setImageLoading(true);
                        await preloadNextImage({
                          src: image.url,
                          width: imageData.width,
                          height: imageData.height,
                        });
                        setActiveImageUrl(image.url);
                        setImageLoading(false);
                      }}
                      disabled={imageLoading}
                      aria-label={`View version ${image.version}${activeImageUrl === image.url ? ' (current)' : ''}`}
                      aria-pressed={activeImageUrl === image.url}
                    >
                      <Image
                        width={imageData.width}
                        height={imageData.height}
                        style={{
                          aspectRatio: imageData.width / imageData.height,
                        }}
                        className="w-auto max-md:h-20"
                        src={image.url}
                        alt={`Image version ${image.version}${image.prompt ? ` - ${image.prompt}` : ''}`}
                      />
                    </button>
                    {images.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVersion(image.url);
                        }}
                        className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer focus:opacity-100"
                        title="Delete this version"
                        aria-label={`Delete version ${image.version}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>

          <div className={clsx(
            activeImage ? "flex-1 flex flex-col overflow-hidden" : "flex-1"
          )}>
            {!activeImage ? (
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-20">
                  <h1 className="text-4xl font-bold text-white mb-8 md:text-5xl">
                    Edit images with AI
                  </h1>
                  <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                    Upload any image and describe the changes you want. Simple and fast.
                  </p>
                </div>

                <div className="mb-12">
                  <ImageUploader
                    onUpload={async ({ url, width, height }) => {
                      setImageData({ width, height });
                      setImages([{ url, version: 0 }]);
                      setActiveImageUrl(url);
                      // Preload the image for smooth display
                      await preloadNextImage({
                        src: url,
                        width,
                        height,
                      });
                    }}
                  />
                </div>

                <div className="mb-12">
                  <SampleImages
                    onSelect={async ({ url, width, height }) => {
                      setImageData({ width, height });
                      setImages([{ url, version: 0 }]);
                      setActiveImageUrl(url);
                      // Preload the image for smooth display
                      await preloadNextImage({
                        src: url,
                        width,
                        height,
                      });
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full relative min-h-0">
                {/* Image Display Area */}
                <div 
                  ref={imageContainerRef}
                  className="flex-1 relative flex items-center justify-center touch-pan-y select-none bg-gray-900 rounded-xl overflow-hidden min-h-0"
                  role="img"
                  aria-label={`Current image: version ${activeImage.version}${activeImage.prompt ? ` - ${activeImage.prompt}` : ''}`}
                >
                  {/* Image container with exact dimensions and black space padding */}
                  <div 
                    className="relative w-full h-full flex items-center justify-center"
                  >
                    <Image
                      key={`main-${activeImage.version}-${activeImage.url}`}
                      width={imageData.width}
                      height={imageData.height}
                      src={activeImage.url}
                      style={{
                        aspectRatio: imageData.width / imageData.height,
                      }}
                      alt={`Generated image version ${activeImage.version}${activeImage.prompt ? `: ${activeImage.prompt}` : ''}`}
                      className="object-contain max-md:max-h-[50vh] md:max-h-[70vh] pointer-events-none"
                      priority
                    />

                    {/* Version Navigation Hints for Mobile */}
                    {images.length > 1 && (
                      <>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 md:hidden" aria-hidden="true">
                          <div className="bg-black/50 text-white p-2 rounded-full opacity-50">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                          </div>
                        </div>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 md:hidden" aria-hidden="true">
                          <div className="bg-black/50 text-white p-2 rounded-full opacity-50">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Top overlay with version and download */}
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 via-black/50 to-transparent p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm font-mono text-xs text-white border border-white/20" aria-label={`Version ${activeImage.version}`}>
                            v{activeImage.version}
                          </div>
                        </div>
                        <button
                          title="Download image (Cmd/Ctrl + D)"
                          onClick={handleDownload}
                          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/20 transition hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                          aria-label="Download current image"
                        >
                          <DownloadIcon aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom overlay with prompt */}
                    {activeImage.prompt && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4">
                        <div className="space-y-1">
                          <p className="text-xs text-white/60 font-medium uppercase tracking-wide">
                            Prompt
                          </p>
                          <p className="text-sm text-white leading-relaxed" title={activeImage.prompt}>
                            {activeImage.prompt}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Ring border overlay */}
                    <div className="pointer-events-none absolute inset-0 rounded-xl ring ring-white/10 ring-inset" />

                    {/* Loading overlays */}
                    {pending && (
                      <ScanningEffect />
                    )}

                    {imageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-xl" role="status" aria-live="polite">
                        <Spinner className="size-6 text-white" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom section with suggestions and input */}
                <div className="flex-shrink-0 space-y-3 mt-4">
                  {/* Floating Suggestions */}
                  <div>
                    <SuggestedPrompts
                      imageUrl={activeImage.url}
                      onSelect={(suggestion) => {
                        flushSync(() => {
                          setPrompt(suggestion);
                        });
                        formRef.current?.requestSubmit();
                      }}
                    />
                  </div>

                  {/* Chat Input Bar */}
                <form
                  ref={formRef}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-border rounded-full shadow-sm"
                  role="search"
                  aria-label="Edit image with AI prompt"
                  action={(formData) => {
                    startTransition(async () => {
                      const prompt = formData.get("prompt") as string;

                      const generation = await generateImage({
                        imageUrl: activeImage.url,
                        prompt,
                        width: imageData.width,
                        height: imageData.height,
                      });

                      if (generation.success) {
                        await preloadNextImage({
                          src: generation.url,
                          width: imageData.width,
                          height: imageData.height,
                        });
                        setImages((current) => [
                          ...current,
                          {
                            url: generation.url,
                            prompt,
                            version: current.length,
                          },
                        ]);
                        setActiveImageUrl(generation.url);
                        setPrompt("");
                      } else {
                        toast.error(generation.error || "Failed to edit image");
                      }
                    });
                  }}
                >
                  <Fieldset className="flex-1">
                    <label htmlFor="prompt-input" className="sr-only">
                      Describe the changes you want to make to the image
                    </label>
                    <input
                      id="prompt-input"
                      type="text"
                      name="prompt"
                      className="w-full bg-transparent text-foreground placeholder-muted-foreground focus:outline-none text-sm px-2 py-1 leading-normal"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe the changes you want to make..."
                      required
                      disabled={pending}
                    />
                  </Fieldset>
                  <button
                    type="submit"
                    disabled={!prompt.trim() || pending}
                    className="bg-primary text-primary-foreground p-2 rounded-full hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background shadow-sm"
                    aria-label={pending ? "Processing your request..." : "Send prompt to edit image"}
                  >
                    {pending ? (
                      <Spinner className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19V5m-7 7l7-7 7 7" />
                      </svg>
                    )}
                  </button>
                </form>

                  {/* Navigation hints */}
                  {images.length > 1 && (
                    <div className="mt-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        <span className="md:inline hidden">Use ← → arrow keys to navigate versions</span>
                        <span className="md:hidden">Swipe left/right to navigate versions</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

            <div className="w-40 shrink-0" />
          </div>
        </div>
        
        {activeImage && (
          <ChatInterface 
            activeImageUrl={activeImageUrl}
            imageData={imageData}
            onImageGenerated={async (imageUrl: string, prompt: string) => {
              // Preload the new image
              await preloadNextImage({
                src: imageUrl,
                width: imageData.width,
                height: imageData.height,
              });
              
              // Add to images array (check for duplicates)
              setImages((current) => {
                // Don't add if URL already exists
                if (current.some(img => img.url === imageUrl)) {
                  return current;
                }
                
                return [
                  ...current,
                  {
                    url: imageUrl,
                    prompt,
                    version: current.length,
                  },
                ];
              });
              
              // Set as active image
              setActiveImageUrl(imageUrl);
            }}
          />
        )}
      </div>
    </>
  );
}