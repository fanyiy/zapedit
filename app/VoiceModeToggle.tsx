'use client';

import { Mic, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

interface VoiceModeToggleProps {
  isVoiceMode: boolean;
  onToggle: (voiceMode: boolean) => void;
  disabled?: boolean;
  disableVoice?: boolean;
}

export function VoiceModeToggle({ isVoiceMode, onToggle, disabled, disableVoice = true }: VoiceModeToggleProps) {
  // If voice is disabled and currently in voice mode, switch back to text mode
  const effectiveIsVoiceMode = disableVoice ? false : isVoiceMode;
  
  return (
    <div className="flex items-center space-x-0.5 bg-muted rounded-full p-0.5">
      <button
        onClick={() => onToggle(false)}
        disabled={disabled}
        className={clsx(
          "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200",
          !effectiveIsVoiceMode
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <MessageSquare className="w-3 h-3" />
        <span>Text</span>
      </button>
      <button
        onClick={() => !disableVoice && onToggle(true)}
        disabled={disabled || disableVoice}
        className={clsx(
          "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200",
          effectiveIsVoiceMode
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          (disabled || disableVoice) && "opacity-50 cursor-not-allowed"
        )}
      >
        <Mic className="w-3 h-3" />
        <span>Voice</span>
      </button>
    </div>
  );
}