"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

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

  const handleDeleteProject = async (imageId: string) => {
    if (deletingProjectId) return; // Prevent multiple deletions
    
    setDeletingProjectId(imageId);
    
    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      // Remove the project from the local state
      setProjects(prev => prev.filter(project => project.imageId !== imageId));
      setShowDeleteConfirm(null);
      toast.success('Project deleted successfully');
    } catch (err) {
      console.error('Error deleting project:', err);
      toast.error('Failed to delete project');
    } finally {
      setDeletingProjectId(null);
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
          <div key={project.imageId} className="group relative">
            <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-muted-foreground transition-all duration-200 hover:shadow-lg">
              <div className="flex items-center gap-4 p-3">
                {/* Project Image */}
                <button
                  onClick={() => onProjectSelect(project)}
                  className="w-16 h-16 relative overflow-hidden bg-gray-900 rounded-lg flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
                >
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
                </button>
                
                {/* Project Info */}
                <button
                  onClick={() => onProjectSelect(project)}
                  className="flex-1 min-w-0 text-left cursor-pointer"
                >
                  <div className="space-y-1">
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
                    
                    <div className="text-xs text-muted-foreground">
                      <span>{project.editCount} edit{project.editCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </button>

                {/* Action Menu */}
                <div className="flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(project.imageId);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    title="Delete project"
                    aria-label="Delete project"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div 
            className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">Delete Project</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Are you sure you want to delete this project? This will permanently delete the original image and all edit versions. This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deletingProjectId === showDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProject(showDeleteConfirm)}
                disabled={deletingProjectId === showDeleteConfirm}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 min-w-[100px] justify-center"
              >
                {deletingProjectId === showDeleteConfirm ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 