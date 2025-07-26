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
    <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
      <button
        onClick={() => onToggle(false)}
        disabled={disabled}
        className={clsx(
          "flex items-center space-x-2 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200",
          !isVoiceMode
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <MessageSquare className="w-4 h-4" />
        <span>Text</span>
      </button>
      <button
        onClick={() => onToggle(true)}
        disabled={disabled}
        className={clsx(
          "flex items-center space-x-2 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200",
          isVoiceMode
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Mic className="w-4 h-4" />
        <span>Voice</span>
      </button>
    </div>
  );
}