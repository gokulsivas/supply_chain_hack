import { cn } from "@/lib/utils";
import { User, Bot, Info } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";
  const isSystem = role === "system";

  return (
    <div
      className={cn(
        "flex w-full gap-3 transition-opacity duration-200",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="shrink-0 mt-0.5">
          {isSystem ? (
            <div className="flex size-7 items-center justify-center bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Info className="size-3.5" />
            </div>
          ) : (
            <div className="flex size-7 items-center justify-center bg-primary/10 text-primary border border-primary/20">
              <Bot className="size-3.5" />
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "relative max-w-[85%] text-xs leading-relaxed break-words",
          isUser &&
            "bg-primary text-primary-foreground border border-primary/40 px-4 py-2.5 shadow-xs font-medium",
          !isUser &&
            !isSystem &&
            "bg-muted/60 text-foreground border border-border px-4 py-2.5 shadow-xs",
          isSystem &&
            "bg-blue-500/10 text-blue-900 dark:text-blue-300 border border-blue-500/20 px-4 py-2.5 font-medium"
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>

      {isUser && (
        <div className="shrink-0 mt-0.5">
          <div className="flex size-7 items-center justify-center bg-primary text-primary-foreground shadow-xs">
            <User className="size-3.5" />
          </div>
        </div>
      )}
    </div>
  );
}
