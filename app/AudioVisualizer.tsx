'use client';

import React from 'react';

interface AudioVisualizerProps {
  stream?: MediaStream;
  isActive?: boolean;
  className?: string;
}

export function AudioVisualizer({ stream, isActive = false, className = '' }: AudioVisualizerProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animationRef = React.useRef<number | undefined>(undefined);
  const audioContextRef = React.useRef<AudioContext | undefined>(undefined);
  const analyserRef = React.useRef<AnalyserNode | undefined>(undefined);
  const sourceRef = React.useRef<MediaStreamAudioSourceNode | undefined>(undefined);

  React.useEffect(() => {
    if (!stream || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    // Set up audio context and analyser
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    audioContextRef.current = audioCtx;
    
    const source = audioCtx.createMediaStreamSource(stream);
    sourceRef.current = source;
    
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;
    
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasCtx || !analyser) return;
      
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      // Get CSS custom properties for theming
      const backgroundColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--background')?.trim() || '#ffffff';
      const textColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--foreground')?.trim() || '#000000';

      // Clear canvas with background color
      canvasCtx.fillStyle = backgroundColor;
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      // Set up gradient for the waveform
      const gradient = canvasCtx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, textColor + '00'); // transparent
      gradient.addColorStop(0.1, textColor + 'FF'); // opaque
      gradient.addColorStop(0.9, textColor + 'FF'); // opaque
      gradient.addColorStop(1, textColor + '00'); // transparent

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = gradient;
      canvasCtx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    if (isActive) {
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stream, isActive]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-24 border border-border rounded-lg ${className}`}
      style={{ width: '100%', height: '6rem' }}
    />
  );
}