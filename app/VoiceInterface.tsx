'use client';

import React from 'react';
import { AudioVisualizer } from './AudioVisualizer';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { VoiceModeToggle } from './VoiceModeToggle';
import clsx from 'clsx';

interface VoiceInterfaceProps {
  activeImageUrl: string | null;
  imageData: { width: number; height: number };
  currentImageId?: string | null;
  onImageGenerated: (imageUrl: string, prompt: string) => void;
  onImageActivated?: (imageUrl: string) => void;
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

export function VoiceInterface({ 
  activeImageUrl, 
  imageData = { width: 1024, height: 768 },
  onImageGenerated,
  onImageActivated,
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
            
            // If the agent edited a different image than the currently active one,
            // first make that image active so user can see which image was edited
            if (result.originalImageUrl && result.originalImageUrl !== activeImageUrl && onImageActivated) {
              onImageActivated(result.originalImageUrl);
            }
            
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
    setStatusMessage('Connecting...');
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
        setStatusMessage('Ready to listen');
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
            setStatusMessage('Processing...');
            break;
            
          case 'response.audio.delta':
            setCurrentStatus('speaking');
            setStatusMessage('Responding...');
            break;
            
          case 'response.function_call_arguments.delta':
            // Only update status if this is a new function call
            if (msg.name === 'editImage' && currentFunctionCall.current !== msg.call_id) {
              setCurrentStatus('editing');
              setStatusMessage('Editing...');
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
                setStatusMessage('Editing...');
              }
              
              try {
                const args = JSON.parse(msg.arguments);
                const result = await functionDef.fn(args);
                
                console.log('Function result:', result);

                // Update status based on result
                if (result.success && msg.name === 'editImage') {
                  setCurrentStatus('edit_complete');
                  setStatusMessage('Complete');
                  setTimeout(() => {
                    setCurrentStatus('listening');
                    setStatusMessage('Listening...');
                  }, 2000);
                } else if (!result.success) {
                  setCurrentStatus('error');
                  setStatusMessage('Error');
                  setTimeout(() => {
                    setCurrentStatus('listening');
                    setStatusMessage('Listening...');
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
                setStatusMessage('Error');
                setTimeout(() => {
                  setCurrentStatus('listening');
                  setStatusMessage('Listening...');
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
              setStatusMessage('Listening...');
            }
            break;
            
          case 'input_audio_buffer.speech_started':
            setCurrentStatus('listening');
            setStatusMessage('Listening...');
            break;
            
          case 'input_audio_buffer.speech_stopped':
            setCurrentStatus('processing');
            setStatusMessage('Processing...');
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
      setStatusMessage('Connection failed');
      onConnectionStatusChange?.('error');
    }
  }, [connectionStatus, currentStatus, tools, functionDefinitions, onConnectionStatusChange]);

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
    setStatusMessage('Disconnected');
    
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount/unmount

  // Cleanup when switching away from voice mode
  React.useEffect(() => {
    return () => {
      if (outputStream) {
        console.log('Cleaning up output stream on component change');
        outputStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [outputStream]);

  if (!activeImageUrl) {
    return (
      <div className="w-full bg-card border-l border-border flex flex-col">
        <div className="p-6 border-b border-border/50 flex items-center justify-start">
          {onToggleMode && (
            <VoiceModeToggle 
              isVoiceMode={true} 
              onToggle={onToggleMode}
              disabled={false}
              disableVoice={true}
            />
          )}
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-3">
            <Mic className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Upload an image to start
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-card border-l border-border flex flex-col">
      {/* Minimal Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-start mb-4">
          {onToggleMode && (
            <VoiceModeToggle 
              isVoiceMode={true} 
              onToggle={onToggleMode}
              disabled={connectionStatus === 'connecting'}
              disableVoice={true}
            />
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={connectionStatus === 'connected' ? disconnectVoice : initializeVoiceConnection}
            disabled={connectionStatus === 'connecting'}
            className={clsx(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
              connectionStatus === 'connected' 
                ? "text-red-600 hover:bg-red-50" 
                : "text-green-600 hover:bg-green-50",
              connectionStatus === 'connecting' && "opacity-50"
            )}
          >
            {connectionStatus === 'connected' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {connectionStatus === 'connecting' ? 'Connecting' : connectionStatus === 'connected' ? 'Disconnect' : 'Connect'}
          </button>

          {connectionStatus === 'connected' && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Status */}
      {statusMessage && (
        <div className="px-6 py-3 border-b border-border/50">
          <div className="text-sm text-muted-foreground">{statusMessage}</div>
        </div>
      )}

      {/* Audio Visualizer */}
      <div className="p-6">
        <AudioVisualizer 
          stream={audioStream || undefined} 
          isActive={isListening && connectionStatus === 'connected'} 
        />
      </div>

      {/* Simple Instructions */}
      {connectionStatus === 'connected' && (
        <div className="px-6 pb-6">
          <div className="text-sm text-muted-foreground">
            Say things like &quot;add a sunset background&quot; or &quot;make it more colorful&quot;
          </div>
        </div>
      )}

      {/* Audio Output */}
      {outputStream && (
        <AudioPlayback stream={outputStream} muted={isMuted} />
      )}
    </div>
  );
}