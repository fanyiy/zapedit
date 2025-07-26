'use client';

import React from 'react';
import { AudioVisualizer } from './AudioVisualizer';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, Loader2, CheckCircle, AlertCircle, Edit3 } from 'lucide-react';
import { VoiceModeToggle } from './VoiceModeToggle';
import clsx from 'clsx';

interface VoiceInterfaceProps {
  activeImageUrl: string | null;
  imageData: { width: number; height: number };
  currentImageId?: string | null;
  onImageGenerated: (imageUrl: string, prompt: string) => void;
  onConnectionStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  onToggleMode?: (voiceMode: boolean) => void;
}

interface AudioStreamProps {
  stream: MediaStream;
}

const AudioPlayback: React.FC<AudioStreamProps & { muted?: boolean }> = ({ stream, muted = false }) => {
  const audioRef = React.useRef<HTMLAudioElement>(null);

  React.useEffect(() => {
    if (audioRef.current && stream) {
      console.log('Setting audio stream:', stream);
      audioRef.current.srcObject = stream;
      audioRef.current.muted = muted;
    }
  }, [stream, muted]);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, [muted]);

  return <audio ref={audioRef} autoPlay className="hidden" />;
};

const StatusIndicator: React.FC<{
  status: 'idle' | 'listening' | 'processing' | 'speaking' | 'editing' | 'edit_complete' | 'error';
  message: string;
}> = ({ status, message }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'listening':
        return {
          icon: <Mic className="w-4 h-4" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          pulse: true
        };
      case 'processing':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          pulse: false
        };
      case 'speaking':
        return {
          icon: <MessageCircle className="w-4 h-4" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          pulse: true
        };
      case 'editing':
        return {
          icon: <Edit3 className="w-4 h-4" />,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          pulse: true
        };
      case 'edit_complete':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          pulse: false
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          pulse: false
        };
      default:
        return {
          icon: <Mic className="w-4 h-4" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          pulse: false
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={clsx(
      "flex items-center gap-3 p-3 rounded-xl border transition-all duration-300",
      config.bgColor,
      config.borderColor,
      config.pulse && "animate-pulse"
    )}>
      <div className={clsx("flex-shrink-0", config.color)}>
        {config.icon}
      </div>
      <div className="flex-1">
        <div className={clsx("text-sm font-medium", config.color)}>
          {status.replace('_', ' ').toUpperCase()}
        </div>
        <div className="text-xs text-gray-600 mt-0.5">
          {message}
        </div>
      </div>
    </div>
  );
};

export function VoiceInterface({ 
  activeImageUrl, 
  imageData = { width: 1024, height: 768 },
  onImageGenerated,
  onConnectionStatusChange,
  onToggleMode
}: VoiceInterfaceProps) {
  const [connectionStatus, setConnectionStatus] = React.useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [isMuted, setIsMuted] = React.useState(false);
  const [audioStream, setAudioStream] = React.useState<MediaStream | null>(null);
  const [outputStream, setOutputStream] = React.useState<MediaStream | null>(null);
  const [isListening, setIsListening] = React.useState(false);
  const [currentStatus, setCurrentStatus] = React.useState<'idle' | 'listening' | 'processing' | 'speaking' | 'editing' | 'edit_complete' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = React.useState<string>('');

  const peerConnectionRef = React.useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = React.useRef<RTCDataChannel | null>(null);
  const processedToolCalls = React.useRef(new Set<string>());
  const currentFunctionCall = React.useRef<string | null>(null);

  // Function definitions for voice commands (similar to kontext-realtime)
  const functionDefinitions = React.useMemo(() => ({
    editImage: {
      description: 'Edit the current image based on user instructions',
      examplePrompt: 'Add a sunset background to this image',
      parameters: {
        type: 'object',
        properties: {
          prompt: { 
            type: 'string', 
            description: 'The editing instructions for the image - be specific and detailed' 
          }
        },
        required: ['prompt']
      },
      fn: async ({ prompt }: { prompt: string }) => {
        if (!activeImageUrl) {
          return { success: false, error: 'No image available to edit' };
        }

        // Create a unique identifier for this edit request
        const editId = `${prompt}-${activeImageUrl}-${Date.now()}`;
        console.log('Processing edit request:', editId);

        try {
          const response = await fetch('/api/voice-edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              imageUrl: activeImageUrl,
              width: imageData.width,
              height: imageData.height,
              editId, // Include edit ID for backend deduplication if needed
            }),
          });

          const result = await response.json();
          
          if (result.success) {
            console.log('Edit successful, calling onImageGenerated:', result.imageUrl);
            onImageGenerated(result.imageUrl, prompt);
            return { 
              success: true, 
              imageUrl: result.imageUrl,
              message: `Successfully edited the image: "${prompt}"` 
            };
          } else {
            return { 
              success: false, 
              error: result.error,
              message: `Failed to edit the image: ${result.error}` 
            };
          }
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            message: `Error editing the image: ${error instanceof Error ? error.message : 'Unknown error'}` 
          };
        }
      }
    },
    analyzeImage: {
      description: 'Analyze the current image to understand its contents and suggest improvements',
      examplePrompt: 'Tell me about this image and suggest improvements',
      parameters: {
        type: 'object',
        properties: {}
      },
      fn: async () => {
        return {
          success: true,
          analysis: {
            subject: "I can see your current image and I'm ready to help edit it",
            suggestions: [
              "I can enhance the lighting and colors",
              "I can add or remove objects from the scene",
              "I can change the background or apply artistic effects",
              "I can adjust the composition and framing"
            ]
          },
          message: "I've analyzed your image and I'm ready to help with any edits you'd like to make."
        };
      }
    }
  }), [activeImageUrl, imageData, onImageGenerated]);

  const tools = React.useMemo(() => 
    Object.entries(functionDefinitions).map(([name, { ...tool }]) => ({
      type: 'function',
      name,
      description: tool.description,
      parameters: tool.parameters
    }))
  , [functionDefinitions]);

  // Initialize voice connection
  const initializeVoiceConnection = React.useCallback(async () => {
    if (connectionStatus === 'connecting' || connectionStatus === 'connected') return;

    setConnectionStatus('connecting');
    setCurrentStatus('idle');
    setStatusMessage('Connecting to voice assistant...');
    onConnectionStatusChange?.('connecting');

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setIsListening(true);

      // Create peer connection with specific configuration
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionRef.current = peerConnection;

      // Handle incoming audio streams - only keep the latest one
      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        console.log('Received audio stream:', remoteStream);
        
        // Stop any existing output stream to prevent multiple voices
        setOutputStream(prevStream => {
          if (prevStream) {
            prevStream.getTracks().forEach(track => {
              console.log('Stopping previous audio track:', track);
              track.stop();
            });
          }
          return remoteStream;
        });
      };

      // Create data channel for function calls
      const dataChannel = peerConnection.createDataChannel('response');
      dataChannelRef.current = dataChannel;

      // Configure OpenAI session
      const configureSession = () => {
        const event = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            tools,
            instructions: `You are an AI image editing assistant with voice capabilities. You can see and edit the user's current image. 
            
When users ask you to edit their image, use the editImage function with detailed, specific prompts. 
Be conversational and encouraging. Explain what you're doing as you edit images.
The user has an image loaded that you can edit using your tools.`
          },
        };
        dataChannel.send(JSON.stringify(event));
      };

      dataChannel.addEventListener('open', () => {
        console.log('Data channel opened');
        configureSession();
        setConnectionStatus('connected');
        setCurrentStatus('listening');
        setStatusMessage('Ready to listen - speak your request');
        onConnectionStatusChange?.('connected');
      });

      // Handle function calls and status updates
      dataChannel.addEventListener('message', async (event) => {
        console.log('Received message:', event.data); //TODO: debug
        const msg = JSON.parse(event.data);
        console.log('Received message:', msg);
        
        // Handle different message types for status updates
        switch (msg.type) {
          case 'conversation.item.input_audio_transcription.completed':
            setCurrentStatus('processing');
            setStatusMessage('Processing your request...');
            break;
            
          case 'response.audio.delta':
            setCurrentStatus('speaking');
            setStatusMessage('AI is responding...');
            break;
            
          case 'response.function_call_arguments.delta':
            // Only update status if this is a new function call
            if (msg.name === 'editImage' && currentFunctionCall.current !== msg.call_id) {
              setCurrentStatus('editing');
              setStatusMessage('Editing your image...');
            }
            break;
            
          case 'response.function_call_arguments.done':
            // Create unique identifier for this function call
            const callId = msg.call_id || `${msg.name}-${Date.now()}`;
            
            // Check if we've already processed this exact function call
            if (processedToolCalls.current.has(callId)) {
              console.log('Skipping duplicate function call:', callId);
              break;
            }
            
            const functionDef = functionDefinitions[msg.name as keyof typeof functionDefinitions];
            if (functionDef?.fn) {
              console.log(`Calling function ${msg.name} with call_id:`, callId);
              
              // Mark this call as being processed
              processedToolCalls.current.add(callId);
              currentFunctionCall.current = callId;
              
              if (msg.name === 'editImage') {
                setCurrentStatus('editing');
                setStatusMessage('Processing image edit...');
              }
              
              try {
                const args = JSON.parse(msg.arguments);
                const result = await functionDef.fn(args);
                
                console.log('Function result:', result);

                // Update status based on result
                if (result.success && msg.name === 'editImage') {
                  setCurrentStatus('edit_complete');
                  setStatusMessage('Image edit completed successfully!');
                  setTimeout(() => {
                    setCurrentStatus('listening');
                    setStatusMessage('Ready for your next request');
                  }, 2000);
                } else if (!result.success) {
                  setCurrentStatus('error');
                  const errorMsg = 'error' in result ? result.error : 'Unknown error';
                  setStatusMessage(`Error: ${errorMsg || 'Unknown error'}`);
                  setTimeout(() => {
                    setCurrentStatus('listening');
                    setStatusMessage('Ready to try again');
                  }, 3000);
                }

                // Send result back to OpenAI
                const resultEvent = {
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: msg.call_id,
                    output: JSON.stringify(result),
                  },
                };
                dataChannel.send(JSON.stringify(resultEvent));
                
              } catch (error) {
                console.error('Function execution error:', error);
                setCurrentStatus('error');
                setStatusMessage(`Function error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                setTimeout(() => {
                  setCurrentStatus('listening');
                  setStatusMessage('Ready to try again');
                }, 3000);
              } finally {
                currentFunctionCall.current = null;
              }
            }
            break;
            
          case 'response.audio.done':
            // AI finished speaking, back to listening
            if (currentStatus === 'speaking') {
              setCurrentStatus('listening');
              setStatusMessage('Listening for your next request...');
            }
            break;
            
          case 'input_audio_buffer.speech_started':
            setCurrentStatus('listening');
            setStatusMessage('Listening...');
            break;
            
          case 'input_audio_buffer.speech_stopped':
            setCurrentStatus('processing');
            setStatusMessage('Processing your speech...');
            break;
        }
      });

      // Add audio tracks
      stream.getTracks().forEach((track) => {
        peerConnection.addTransceiver(track, { direction: 'sendrecv' });
      });

      // Create offer and connect to OpenAI
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const response = await fetch('/api/rtc-connect', {
        method: 'POST',
        body: offer.sdp,
        headers: {
          'Content-Type': 'application/sdp',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to connect to OpenAI Realtime API: ${response.status} - ${errorText}`);
      }

      const answer = await response.text();
      await peerConnection.setRemoteDescription({
        sdp: answer,
        type: 'answer',
      });

    } catch (error) {
      console.error('Failed to initialize voice connection:', error);
      setConnectionStatus('error');
      setCurrentStatus('error');
      setStatusMessage(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      onConnectionStatusChange?.('error');
    }
  }, [connectionStatus, tools, functionDefinitions, onConnectionStatusChange]);

  // Disconnect voice connection
  const disconnectVoice = React.useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }

    if (outputStream) {
      outputStream.getTracks().forEach(track => track.stop());
      setOutputStream(null);
    }

    setIsListening(false);
    setConnectionStatus('disconnected');
    setCurrentStatus('idle');
    setStatusMessage('Disconnected from voice assistant');
    
    // Clear processed function calls for fresh state
    processedToolCalls.current.clear();
    currentFunctionCall.current = null;
    
    onConnectionStatusChange?.('disconnected');
  }, [audioStream, outputStream, onConnectionStatusChange]);

  // Auto-connect when component mounts
  React.useEffect(() => {
    initializeVoiceConnection();
    
    // Cleanup on unmount
    return () => {
      console.log('VoiceInterface unmounting, cleaning up...');
      disconnectVoice();
    };
  }, []);

  // Cleanup when switching away from voice mode
  React.useEffect(() => {
    return () => {
      if (outputStream) {
        console.log('Cleaning up output stream on component change');
        outputStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [outputStream]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected - Listening';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  if (!activeImageUrl) {
    return (
      <div className="w-full bg-card border-l border-border flex flex-col">
        {/* Mode Toggle Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-foreground">Voice Mode</h3>
            {onToggleMode && (
              <VoiceModeToggle 
                isVoiceMode={true} 
                onToggle={onToggleMode}
                disabled={false}
              />
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted border border-border">
              <Mic className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-3">
              Voice Mode
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Upload an image to start voice editing with your AI assistant
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-card border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-foreground">Voice Mode</h3>
          <div className="flex items-center gap-3">
            <div className={clsx("text-xs font-medium", getStatusColor())}>
              {getStatusText()}
            </div>
            {onToggleMode && (
              <VoiceModeToggle 
                isVoiceMode={true} 
                onToggle={onToggleMode}
                disabled={connectionStatus === 'connecting'}
              />
            )}
          </div>
        </div>
        
        {/* Connection Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={connectionStatus === 'connected' ? disconnectVoice : initializeVoiceConnection}
            disabled={connectionStatus === 'connecting'}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
              connectionStatus === 'connected' 
                ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200" 
                : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200",
              connectionStatus === 'connecting' && "opacity-50 cursor-not-allowed"
            )}
          >
            {connectionStatus === 'connected' ? (
              <>
                <MicOff className="w-4 h-4" />
                Disconnect
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect'}
              </>
            )}
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            disabled={connectionStatus !== 'connected'}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all bg-muted hover:bg-muted/80 disabled:opacity-50"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="p-4">
        <StatusIndicator status={currentStatus} message={statusMessage} />
      </div>

      {/* Audio Visualizer */}
      <div className="p-4">
        <div className="text-xs text-muted-foreground mb-2">Audio Input</div>
        <AudioVisualizer 
          stream={audioStream || undefined} 
          isActive={isListening && connectionStatus === 'connected'} 
        />
      </div>

      {/* Instructions */}
      <div className="flex-1 p-4 space-y-4">
        <div className="bg-muted/50 border border-border rounded-xl p-4">
          <h4 className="text-sm font-medium text-foreground mb-3">What you can say:</h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            {Object.entries(functionDefinitions)
              .filter(([, { examplePrompt }]) => examplePrompt)
              .map(([name, { examplePrompt, description }]) => (
                <div key={name} className="border-l-2 border-primary/20 pl-3">
                  <div className="font-medium text-foreground mb-1">&quot;{examplePrompt}&quot;</div>
                  <div className="text-xs">{description}</div>
                </div>
              ))
            }
          </div>
        </div>

        {connectionStatus === 'connected' && currentStatus === 'listening' && (
          <div className="text-center text-sm text-blue-600 font-medium animate-pulse">
🎤 Speak now - I&apos;m listening for your image editing request
          </div>
        )}
        
        {currentStatus === 'editing' && (
          <div className="text-center text-sm text-purple-600 font-medium">
            ✨ Working on your image edit - this may take a moment...
          </div>
        )}
        
        {currentStatus === 'edit_complete' && (
          <div className="text-center text-sm text-green-600 font-medium">
            ✅ Edit complete! Your new image should appear on the left
          </div>
        )}

        {connectionStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="text-sm text-red-700 font-medium mb-2">Connection Error</div>
            <div className="text-xs text-red-600 mb-3">
              Failed to connect to voice assistant. This could be due to:
            </div>
            <ul className="text-xs text-red-600 space-y-1 mb-3">
              <li>• Microphone permission not granted</li>
              <li>• Network connectivity issues</li>
              <li>• OpenAI API configuration problems</li>
            </ul>
            <button
              onClick={initializeVoiceConnection}
              className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Audio Output */}
      {outputStream && (
        <AudioPlayback stream={outputStream} muted={isMuted} />
      )}
    </div>
  );
}