'use client';

import { Mic, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

interface VoiceModeToggleProps {
  isVoiceMode: boolean;
  onToggle: (voiceMode: boolean) => void;
  disabled?: boolean;
}

export function VoiceModeToggle({ isVoiceMode, onToggle, disabled }: VoiceModeToggleProps) {
  return (
    <div className="flex items-center space-x-0.5 bg-muted rounded-full p-0.5">
      <button
        onClick={() => onToggle(false)}
        disabled={disabled}
        className={clsx(
          "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200",
          !isVoiceMode
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <MessageSquare className="w-3 h-3" />
        <span>Text</span>
      </button>
      <button
        onClick={() => onToggle(true)}
        disabled={disabled}
        className={clsx(
          "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200",
          isVoiceMode
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Mic className="w-3 h-3" />
        <span>Voice</span>
      </button>
    </div>
  );
}