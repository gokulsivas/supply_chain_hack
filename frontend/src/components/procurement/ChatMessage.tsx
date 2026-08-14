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
        "flex w-full gap-4 p-4",
        isUser && "bg-transparent",
        !isUser && !isSystem && "bg-muted/50 rounded-lg",
        isSystem && "bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg"
      )}
    >
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="size-4" />
          </div>
        ) : isSystem ? (
          <div className="flex size-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-400">
            <Info className="size-4" />
          </div>
        ) : (
          <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Bot className="size-4" />
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-hidden px-1">
        <div className="prose prose-sm dark:prose-invert break-words">
          <p className="leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  );
}
