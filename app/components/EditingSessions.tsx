"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

interface EditSession {
  id: string;
  prompt: string;
  status: string;
  resultUrl: string | null;
  createdAt: string;
}

interface Project {
  imageId: string;
  originalUrl: string;
  width: number;
  height: number;
  imageCreatedAt: string;
  lastEditedAt: string;
  editCount: number;
  latestEdit: {
    prompt: string;
    resultUrl: string | null;
    createdAt: string;
  } | null;
  sessions: EditSession[];
}

interface EditingSessionsProps {
  onProjectSelect: (project: {
    imageId: string;
    originalUrl: string;
    width: number | null;
    height: number | null;
    sessions: Array<{
      id: string;
      prompt: string;
      status: string;
      resultUrl: string | null;
      createdAt: string;
    }>;
  }) => void;
}

export function EditingSessions({ onProjectSelect }: EditingSessionsProps) {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    fetchSessions();
  }, [session]);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/sessions");
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user) {
    return (
      <div className="text-center text-muted-foreground">
        <p>Sign in to see your editing history</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
        <p>Loading your projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        <p>Failed to load projects: {error}</p>
        <button 
          onClick={fetchSessions}
          className="mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Try again
        </button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted border border-border">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          No editing sessions yet
        </h3>
        <p className="text-sm leading-relaxed max-w-md mx-auto">
          Upload your first image to start creating and editing with AI
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Recent Projects</h2>
        <span className="text-sm text-muted-foreground">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {projects.map((project) => (
          <button
            key={project.imageId}
            onClick={() => onProjectSelect(project)}
            className="group bg-card border border-border rounded-xl overflow-hidden hover:border-muted-foreground transition-all duration-200 hover:shadow-lg text-left cursor-pointer w-full flex items-center gap-4 p-3"
          >
            <div className="w-16 h-16 relative overflow-hidden bg-gray-900 rounded-lg flex-shrink-0">
              <Image
                src={project.latestEdit?.resultUrl || project.originalUrl}
                alt="Project preview"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                sizes="64px"
              />
              <div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full">
                {project.editCount}
              </div>
            </div>
            
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {project.width} × {project.height}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(project.lastEditedAt), { addSuffix: true })}
                </span>
              </div>
              
              {project.latestEdit && (
                <p className="text-sm text-foreground line-clamp-1 leading-relaxed">
                  {project.latestEdit.prompt}
                </p>
              )}
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{project.editCount} edit{project.editCount !== 1 ? 's' : ''}</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
} 