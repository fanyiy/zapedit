'use client';

import { useChat } from '@ai-sdk/react';
import * as React from 'react';
import clsx from 'clsx';
import { Fieldset } from './Fieldset';
import Spinner from './Spinner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Palette, CheckCircle, XCircle, Search, Undo2, Lightbulb } from 'lucide-react';
import { VoiceModeToggle } from './VoiceModeToggle';
import { VoiceInterface } from './VoiceInterface';

interface ChatInterfaceProps {
  activeImageUrl: string | null;
  imageData: { width: number; height: number };
  currentImageId?: string | null;
  selectedSuggestion?: string | null;
  onSuggestionUsed?: () => void;
  onImageGenerated: (imageUrl: string, prompt: string) => void;
}

export function ChatInterface({ 
  activeImageUrl, 
  imageData = { width: 1024, height: 768 },
  currentImageId,
  selectedSuggestion,
  onSuggestionUsed,
  onImageGenerated 
}: ChatInterfaceProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const processedToolCalls = React.useRef(new Set<string>());
  const [provider, setProvider] = React.useState<'fal' | 'modelscope'>('fal');
  const [isVoiceMode, setIsVoiceMode] = React.useState(false);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setInput,
  } = useChat({
    api: '/api/chat',
    body: {
      activeImageUrl,
      imageData,
      provider,
    },
    onFinish: () => {
      // Auto-scroll after message finishes
      scrollToBottom();
    },
  });

  const resizeTextarea = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 128); // 128px = max-h-32
    textarea.style.height = newHeight + 'px';
    
    // Enable scrolling when content exceeds max height
    if (textarea.scrollHeight > 128) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  }, []);

  const scrollToBottom = React.useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      // Also ensure immediate scroll for reliability
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, []);

  // Auto-scroll when messages change or when loading state changes
  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Handle selected suggestions
  React.useEffect(() => {
    if (selectedSuggestion) {
      setInput(selectedSuggestion);
      onSuggestionUsed?.();
    }
  }, [selectedSuggestion, setInput, onSuggestionUsed]);

  // Resize textarea when input changes (including programmatic changes)
  React.useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  // Handle tool calls for image editing
  React.useEffect(() => {
    let hasNewToolResult = false;
    
    messages.forEach(message => {
      message.parts.forEach(part => {
        if (part.type === 'tool-invocation' && 
            part.toolInvocation.toolName === 'editImage' && 
            'result' in part.toolInvocation && 
            part.toolInvocation.result?.success) {
          
          // Create unique ID for this tool call
          const toolCallId = `${message.id}-${part.toolInvocation.toolName}-${JSON.stringify(part.toolInvocation.args)}`;
          
          // Skip if already processed
          if (processedToolCalls.current.has(toolCallId)) {
            return;
          }
          
          processedToolCalls.current.add(toolCallId);
          const { imageUrl, prompt } = part.toolInvocation.result;
          
          // Save session to database if we have an image ID
          if (currentImageId) {
            saveEditSession(currentImageId, prompt, 'completed', imageUrl);
          }
          
          onImageGenerated?.(imageUrl, prompt);
          hasNewToolResult = true;
        }
      });
    });
    
    // Auto-scroll after processing tool results
    if (hasNewToolResult) {
      setTimeout(scrollToBottom, 200);
    }
  }, [messages, onImageGenerated, scrollToBottom, currentImageId]);

  // Function to save edit session to database
  const saveEditSession = async (imageId: string, prompt: string, status: string, resultUrl?: string) => {
    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId,
          prompt,
          status,
          resultUrl,
        }),
      });
    } catch (error) {
      console.error('Failed to save edit session:', error);
      // Don't show error to user as this is background functionality
    }
  };

  if (!activeImageUrl) {
    return (
      <div className="w-full bg-card border-l border-border flex flex-col">
        {/* Mode Toggle Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-foreground">AI Agent</h3>
            <VoiceModeToggle 
              isVoiceMode={isVoiceMode} 
              onToggle={setIsVoiceMode}
              disabled={false}
            />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted border border-border">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-3">
              AI Agent
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Upload an image to start working with your AI editing agent
            </p>
            {isVoiceMode && (
              <p className="text-muted-foreground text-xs mt-2">
                Voice mode will be available once you upload an image
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render voice interface if voice mode is enabled
  if (isVoiceMode) {
    return (
      <VoiceInterface
        activeImageUrl={activeImageUrl}
        imageData={imageData}
        currentImageId={currentImageId}
        onImageGenerated={onImageGenerated}
        onConnectionStatusChange={() => {}}
        onToggleMode={setIsVoiceMode}
      />
    );
  }

  return (
    <div className="w-full h-screen bg-card border-l border-border flex flex-col">
      {/* Mode Toggle Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">AI Agent</h3>
          <VoiceModeToggle 
            isVoiceMode={isVoiceMode} 
            onToggle={setIsVoiceMode}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar min-h-0">
        {messages.length === 0 && (
          <div className="text-muted-foreground text-sm">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4" />
              <p>Hi! I&apos;m your AI image editing agent.</p>
            </div>
            <p className="mb-4 leading-relaxed">I can see your current image and I&apos;m ready to edit it! Tell me what changes you&apos;d like to make.</p>
            <div className="rounded-xl bg-muted/50 border border-border p-3">
              <p className="text-xs font-medium text-foreground mb-2">What would you like to do?</p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full"></div>
                  Remove or add objects
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full"></div>
                  Change backgrounds & scenery
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full"></div>
                  Apply artistic styles & effects
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full"></div>
                  Enhance colors & lighting
                </li>
              </ul>
            </div>
          </div>
        )}
        
        {messages.map(message => (
          <div key={message.id} className="space-y-2">
            <div className={clsx(
              "text-xs font-medium",
              message.role === 'user' ? "text-primary" : "text-muted-foreground"
            )}>
              {message.role === 'user' ? 'You' : 'AI Agent'}
            </div>
            
            {message.parts.map((part, i) => {
              switch (part.type) {
                case 'text':
                  return (
                    <div key={`${message.id}-${i}`} className={clsx(
                      "text-xs leading-relaxed",
                      message.role === 'user' 
                        ? "text-foreground mr-4" 
                        : "text-foreground mr-4"
                    )}>
                      {message.role === 'user' ? (
                        part.text
                      ) : (
                        <div className="prose">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {part.text}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  );
                case 'tool-invocation':
                  const { toolInvocation } = part;
                  
                  if (toolInvocation.toolName === 'editImage') {
                    const isSuccess = 'result' in toolInvocation && toolInvocation.result?.success;
                    const isError = 'result' in toolInvocation && toolInvocation.result?.success === false;
                    
                    return (
                      <div key={`${message.id}-${i}`} className={clsx(
                        "border rounded-xl p-3 mr-4",
                        isSuccess ? "bg-green-900/20 border-green-500/30" :
                        isError ? "bg-red-900/20 border-red-500/30" :
                        "bg-gray-800/50 border-gray-600"
                      )}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={clsx(
                            "text-xs font-medium flex items-center gap-1",
                            isSuccess ? "text-green-400" :
                            isError ? "text-red-400" :
                            "text-blue-400"
                          )}>
                            {isSuccess ? <CheckCircle className="w-3 h-3" /> : 
                             isError ? <XCircle className="w-3 h-3" /> : 
                             <Palette className="w-3 h-3" />}
                            {isSuccess ? 'Image Edited Successfully' : 
                             isError ? 'Edit Failed' : 
                             'Editing Image'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-300">
                          {'result' in toolInvocation && toolInvocation.result?.message 
                            ? toolInvocation.result.message 
                            : `Applying: "${toolInvocation.args.prompt}"`}
                        </div>
                      </div>
                    );
                  }

                  if (toolInvocation.toolName === 'generateSuggestions') {
                    return (
                      <div key={`${message.id}-${i}`} className="bg-gray-800/50 border border-gray-600 rounded-xl p-3 mr-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="w-3 h-3 text-yellow-400" />
                          <div className="text-xs text-yellow-400 font-medium">Creative Suggestions</div>
                        </div>
                        <div className="space-y-2 text-xs text-gray-300">
                          {'result' in toolInvocation && toolInvocation.result?.suggestions && (
                            <div className="grid gap-2">
                              {toolInvocation.result.suggestions.map((suggestion: string, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => handleSubmit(undefined, { 
                                    body: { activeImageUrl, imageData }, 
                                    data: { message: suggestion } 
                                  })}
                                  className="text-left text-xs p-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (toolInvocation.toolName === 'analyzeImage') {
                    return (
                      <div key={`${message.id}-${i}`} className="bg-muted/80 border border-border rounded-xl p-3 mr-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Search className="w-3 h-3 text-primary" />
                          <div className="text-xs text-primary font-medium">Image Analysis</div>
                        </div>
                        <div className="space-y-2 text-xs text-foreground">
                          {'result' in toolInvocation && toolInvocation.result?.analysis && (
                            <div className="space-y-2">
                              {Object.entries(toolInvocation.result.analysis).map(([key, value]) => {
                                if (key === 'suggestions' && Array.isArray(value)) {
                                  return (
                                    <div key={key}>
                                      <div className="font-medium text-xs text-primary mb-1">Recommendations:</div>
                                      <ul className="space-y-1">
                                        {value.map((suggestion: string, idx: number) => (
                                          <li key={idx} className="text-xs">• {suggestion}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  );
                                }
                                return (
                                  <div key={key} className="text-xs">
                                    <span className="font-medium capitalize">{key}:</span> {value as string}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (toolInvocation.toolName === 'undoLastEdit') {
                    return (
                      <div key={`${message.id}-${i}`} className="bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800 rounded-xl p-3 mr-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Undo2 className="w-3 h-3 text-blue-700 dark:text-blue-300" />
                          <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">Undo Guidance</div>
                        </div>
                        <div className="text-xs text-foreground">
                          {'result' in toolInvocation && toolInvocation.result?.message}
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
              }
            })}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            <Spinner className="size-4" />
            <span>Agent is working...</span>
          </div>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 flex-shrink-0 border-t border-border/50">
        <form onSubmit={handleSubmit} className="relative bg-input border border-border rounded-xl shadow-sm">
          <Fieldset className="flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Describe what you'd like to edit..."
              className="w-full bg-transparent text-foreground placeholder-muted-foreground focus:outline-none text-xs px-3 py-3 pr-12 leading-normal resize-none min-h-[3rem] max-h-32 overflow-y-auto"
              disabled={isLoading}
              rows={1}
              onInput={resizeTextarea}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as React.KeyboardEvent<HTMLTextAreaElement>);
                }
              }}
            />
          </Fieldset>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute bottom-2 right-2 bg-primary text-primary-foreground p-2 rounded-full hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background shadow-sm hover:scale-105"
            title={isLoading ? "Agent is working..." : "Send message to AI agent"}
          >
            {isLoading ? (
              <Spinner className="w-4 h-4" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19V5m-7 7l7-7 7 7" />
              </svg>
            )}
          </button>
        </form>
        
        {/* Provider Dropdown */}
        <div className="mt-3 flex items-center justify-start">
          <div className="relative">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as 'fal' | 'modelscope')}
              className="appearance-none bg-background border border-input rounded-xl pl-2 pr-6 py-1 text-xs text-foreground shadow-xs transition-all duration-200 focus:outline-none hover:bg-muted/50 cursor-pointer"
            >
              <option value="fal">Fal.ai</option>
              <option value="modelscope">ModelScope</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none">
              <svg className="w-3 h-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}