import { startTransition, useActionState, useEffect } from "react";
import { getSuggestions } from "./actions";

const cache = new Map<string, string[]>();


export function SuggestedPrompts({
  imageUrl,
  onSelect,
}: {
  imageUrl: string;
  onSelect: (v: string) => void;
}) {
  const [state, action, pending] = useActionState<{
    url: string;
    suggestions: string[];
  } | null>(async () => {
    let cachedSuggestions = cache.get(imageUrl);

    if (!cachedSuggestions) {
      const newSuggestions = await getSuggestions(imageUrl);
      cache.set(imageUrl, newSuggestions);
      cachedSuggestions = newSuggestions;
    }

    return { url: imageUrl, suggestions: cachedSuggestions };
  }, null);

  useEffect(() => {
    if (!pending && state?.url !== imageUrl) {
      setTimeout(() => {
        startTransition(() => {
          action();
        });
      }, 50);
    }
  }, [action, imageUrl, pending, state?.url]);

  if (pending || !state) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from(Array(3).keys()).map((i) => (
          <div
            className="h-11 md:h-8 px-4 md:px-3 rounded-full bg-muted animate-pulse"
            style={{ width: `${250 + Math.random() * 150}px` }}
            key={i}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {state?.suggestions.map((suggestion, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(suggestion)}
          className="inline-flex items-center px-4 md:px-3 py-3 md:py-2 rounded-full text-sm md:text-xs font-medium bg-muted/80 text-muted-foreground hover:bg-muted hover:text-white transition-all duration-200 border border-border/50 cursor-pointer min-h-[44px] md:min-h-auto"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}