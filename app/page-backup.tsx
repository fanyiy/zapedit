"use client";

import Image, { getImageProps } from "next/image";
import { useRef, useState, useTransition, useEffect, useCallback } from "react";
import { generateImage } from "./actions";
import { ImageUploader } from "./ImageUploader";
import Spinner from "./Spinner";
import { preloadNextImage } from "@/lib/preload-next-image";
import clsx from "clsx";
import { SampleImages } from "./SampleImages";
import { getAdjustedDimensions } from "@/lib/get-adjusted-dimensions";
import { DownloadIcon } from "./components/DownloadIcon";
import { toast } from "sonner";
import { SuggestedPrompts } from "./suggested-prompts/SuggestedPrompts";
import { flushSync } from "react-dom";

type ImageNode = {
  id: string;
  url: string;
  prompt?: string;
  parentId?: string;
  branchName: string;
  timestamp: number;
  version: number;
};

type Branch = {
  name: string;
  nodes: ImageNode[];
  color: string;
};

export default function Home() {
  const [imageNodes, setImageNodes] = useState<ImageNode[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [imageData, setImageData] = useState<{
    width: number;
    height: number;
  }>({ width: 1024, height: 768 });
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [prompt, setPrompt] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const activeImage = imageNodes.find((i) => i.id === activeImageId);

  // Helper function to generate branch colors
  const getBranchColor = (index: number) => {
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green  
      '#f59e0b', // yellow
      '#ef4444', // red
      '#8b5cf6', // purple
      '#f97316', // orange
      '#06b6d4', // cyan
      '#84cc16', // lime
    ];
    return colors[index % colors.length];
  };

  // Helper function to create a new branch
  const createBranch = useCallback((name: string) => {
    const existingBranch = branches.find(b => b.name === name);
    if (existingBranch) return existingBranch;

    const newBranch: Branch = {
      name,
      nodes: [],
      color: getBranchColor(branches.length),
    };
    
    setBranches(prev => [...prev, newBranch]);
    return newBranch;
  }, [branches]);

  // Helper function to add node to a branch
  const addNodeToBranch = (node: ImageNode, branchName: string) => {
    setImageNodes(prev => [...prev, node]);
    setBranches(prev => prev.map(branch => 
      branch.name === branchName 
        ? { ...branch, nodes: [...branch.nodes, node] }
        : branch
    ));
  };

  // Helper function to get version number for a node
  const getNextVersion = (branchName: string, parentNode?: ImageNode) => {
    const branch = branches.find(b => b.name === branchName);
    if (branch && branch.nodes.length > 0) {
      // Continue from the last version in this branch
      return branch.nodes[branch.nodes.length - 1].version + 1;
    } else if (parentNode) {
      // Start from parent's version + 1 when creating new branch
      return parentNode.version + 1;
    }
    return 0;
  };

  // Helper function to generate branch names
  const generateBranchName = () => {
    const branchCount = branches.length;
    const branchNames = ['feature', 'experiment', 'variant', 'test', 'alt'];
    const baseName = branchNames[branchCount % branchNames.length];
    const suffix = Math.floor(branchCount / branchNames.length) + 1;
    return suffix === 1 ? baseName : `${baseName}-${suffix}`;
  };

  // Initialize main branch if needed
  useEffect(() => {
    if (branches.length === 0 && imageNodes.length === 0) {
      createBranch('main');
    }
  }, [branches.length, imageNodes.length, createBranch]);

  const adjustedImageDimensions = getAdjustedDimensions(
    imageData.width,
    imageData.height,
  );

  useEffect(() => {
    function handleNewSession() {
      setImageNodes([]);
      setBranches([]);
      setActiveImageId(null);
    }
    window.addEventListener("new-image-session", handleNewSession);
    return () => {
      window.removeEventListener("new-image-session", handleNewSession);
    };
  }, []);

  async function handleDownload() {
    if (!activeImage) return;

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
    link.download = `image.${extension}`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-7xl">
        {/* Sidebar */}
        <div className="fixed left-0 top-0 h-full w-64 bg-zinc-900/50 backdrop-blur-sm border-r border-zinc-800/50 p-6 overflow-y-auto">
          <div className="mb-8">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">History</h2>
            <div className="space-y-3">
              {imageNodes
                .slice()
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((node) => {
                  const branch = branches.find(b => b.name === node.branchName);
                  const nodeColor = node.branchName === 'main' ? '#3b82f6' : branch?.color || '#10b981';
                  
                  return (
                    <div key={node.id} className="group relative">
                      {/* Version indicator */}
                      <div className="flex items-center gap-3 mb-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: nodeColor }}
                        />
                        <span className="text-xs font-mono text-zinc-500">
                          v{node.version}
                        </span>
                        {node.branchName !== 'main' && (
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full" 
                            style={{ 
                              backgroundColor: `${nodeColor}20`,
                              color: nodeColor,
                            }}
                          >
                            {node.branchName}
                          </span>
                        )}
                      </div>
                      
                      {/* Image thumbnail */}
                      <button
                        className={clsx(
                          "w-full aspect-video rounded-lg overflow-hidden border-2 transition-all duration-200",
                          activeImageId === node.id
                            ? "border-white shadow-lg scale-105"
                            : "border-zinc-700 hover:border-zinc-600 hover:scale-102"
                        )}
                        onClick={() => setActiveImageId(node.id)}
                      >
                        <Image
                          width={imageData.width}
                          height={imageData.height}
                          style={{ aspectRatio: imageData.width / imageData.height }}
                          className="w-full h-full object-cover"
                          src={node.url}
                          alt=""
                        />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="ml-64 min-h-screen">
          <div className="p-8">
            {!activeImage ? (
              <div className="h-screen flex items-center justify-center">
                <div className="max-w-2xl mx-auto text-center">
                  <div className="mb-12">
                    <h1 className="text-5xl font-light text-white mb-6 tracking-tight">
                      AI Image Editor
                    </h1>
                    <p className="text-zinc-400 text-xl leading-relaxed">
                      Upload an image and describe your changes.
                      <br />Create branches to explore different variations.
                    </p>
                  </div>

                  <div className="space-y-8">
                    <ImageUploader
                      onUpload={({ url, width, height }) => {
                        setImageData({ width, height });
                        createBranch('main');
                        const newNode: ImageNode = {
                          id: crypto.randomUUID(),
                          url,
                          branchName: 'main',
                          timestamp: Date.now(),
                          version: 0,
                        };
                        addNodeToBranch(newNode, 'main');
                        setActiveImageId(newNode.id);
                      }}
                    />

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-800"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-zinc-950 px-4 text-sm text-zinc-500">or try a sample</span>
                      </div>
                    </div>

                    <SampleImages
                      onSelect={({ url, width, height }) => {
                        setImageData({ width, height });
                        createBranch('main');
                        const newNode: ImageNode = {
                          id: crypto.randomUUID(),
                          url,
                          branchName: 'main',
                          timestamp: Date.now(),
                          version: 0,
                        };
                        addNodeToBranch(newNode, 'main');
                        setActiveImageId(newNode.id);
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                <div className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm shadow-2xl">
                  <Image
                    width={imageData.width}
                    height={imageData.height}
                    src={activeImage.url}
                    style={{
                      aspectRatio:
                        adjustedImageDimensions.width /
                        adjustedImageDimensions.height,
                    }}
                    alt="Current image"
                    className="object-contain max-md:h-[50vh] md:max-h-[70vh]"
                  />

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400" />
                          <span className="text-sm font-mono text-zinc-300">v{activeImage.version}</span>
                        </div>
                        {activeImage.branchName !== 'main' && (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: branches.find(b => b.name === activeImage.branchName)?.color }}
                            />
                            <span className="text-sm text-zinc-400">{activeImage.branchName}</span>
                          </div>
                        )}
                        {activeImage.prompt && (
                          <div className="max-w-md">
                            <p className="text-xs text-zinc-500 mb-1">Last edit:</p>
                            <p className="text-sm text-zinc-300 truncate">{activeImage.prompt}</p>
                          </div>
                        )}
                      </div>
                      <button
                        title="Download image"
                        onClick={handleDownload}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white transition-all hover:bg-white/20 hover:scale-105"
                      >
                        <DownloadIcon />
                      </button>
                    </div>
                  </div>

                  {pending && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                      <Spinner className="size-6 text-white" />
                      <p className="mt-3 text-lg text-white">
                        Editing your image...
                      </p>
                      <p className="text-sm text-zinc-400">
                        This can take up to 15 seconds.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <form
                    className="relative max-w-2xl mx-auto"
                    key={activeImageId}
                    ref={formRef}
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
                          
                          // Determine branch name - create new branch if editing from non-latest
                          const currentBranch = branches.find(b => b.name === activeImage.branchName);
                          const isLatestInBranch = currentBranch && currentBranch.nodes[currentBranch.nodes.length - 1]?.id === activeImageId;
                          
                          let branchName = activeImage.branchName;
                          if (!isLatestInBranch && activeImage) {
                            // Create new branch from this point
                            branchName = generateBranchName();
                            createBranch(branchName);
                          }
                          
                          const newNode: ImageNode = {
                            id: crypto.randomUUID(),
                            url: generation.url,
                            prompt,
                            parentId: activeImageId || undefined,
                            branchName,
                            timestamp: Date.now(),
                            version: getNextVersion(branchName, activeImage),
                          };
                          
                          addNodeToBranch(newNode, branchName);
                          setActiveImageId(newNode.id);
                          setPrompt("");
                        } else {
                          toast(generation.error);
                        }
                      });
                    }}
                  >
                    <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
                      <label className="block text-sm font-medium text-zinc-300 mb-4">
                        Describe your changes
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="prompt"
                          className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-4 pr-20 text-white placeholder-zinc-400 focus:border-blue-500/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="Add sunglasses, change background, make it vintage..."
                          required
                        />
                        <button
                          type="submit"
                          disabled={!prompt.trim() || pending}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                        >
                          {pending ? <Spinner className="w-4 h-4" /> : "Edit"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-6">
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
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}