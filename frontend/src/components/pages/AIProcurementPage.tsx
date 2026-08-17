"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Bot, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/procurement/ChatMessage";
import { RequisitionReviewCard } from "@/components/procurement/RequisitionReviewCard";
import { RecentRequests } from "@/components/procurement/RecentRequests";
import { extractRequisition, listPurchaseRequests, isApiError } from "@/lib/api";
import type { ExtractionResultResponse, PurchaseRequest } from "@/types/procurement";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

const SUGGESTIONS = [
  "I need 12 mobile phones for Baksa by next Tuesday",
  "Urgently procure 50 barcode scanners for Chennai by next Friday",
  "Need 25 pallets of packaging material at Bengaluru DC next month"
];

export function AIProcurementPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "greeting",
      role: "assistant",
      content: "Hello! I'm your AI procurement assistant. Describe what you need, including the item, quantity, delivery location, required date, and priority. I'll extract these details into a purchase request for you."
    }
  ]);
  const [input, setInput] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeExtraction, setActiveExtraction] = useState<ExtractionResultResponse | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [recentRequests, setRecentRequests] = useState<Record<string, unknown>[]>([]);

  // Request counter to avoid race conditions
  const requestIdCounter = useRef(0);
  const messageIdCounter = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getNextMessageId = () => `msg-${++messageIdCounter.current}`;

  useEffect(() => {
    let isMounted = true;
    listPurchaseRequests().then((data) => {
      if (isMounted && Array.isArray(data)) {
        setRecentRequests(data as unknown as Record<string, unknown>[]);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isExtracting]);

  const handleSend = async (text: string) => {
    // 1. Capture current input into immutable local variable before clearing input
    const capturedInput = String(text || "").trim();
    if (!capturedInput || isExtracting) return;

    setInput("");
    setActiveExtraction(null);

    const currentReqId = ++requestIdCounter.current;

    const userMsg: Message = { id: getNextMessageId(), role: "user", content: capturedInput };
    setMessages(prev => [...prev, userMsg]);
    setIsExtracting(true);

    if (process.env.NODE_ENV !== "production") {
      console.log(`[AI Procurement] Request #${currentReqId} submitted:`, {
        submitted_text: capturedInput,
        request_id: currentReqId,
        timestamp: new Date().toISOString()
      });
    }

    try {
      // 2. Send exact captured string to extraction API
      const result: ExtractionResultResponse = await extractRequisition(capturedInput);

      // 3. Prevent race conditions: ignore if newer request has been triggered
      if (currentReqId !== requestIdCounter.current) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[AI Procurement] Ignoring stale response for Request #${currentReqId}`);
        }
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        console.log(`[AI Procurement] Response for Request #${currentReqId}:`, result);
      }

      // 4. Atomically set extraction state
      setActiveExtraction(result);
      
      const assistantMsg: Message = {
        id: getNextMessageId(),
        role: "assistant",
        content: result.is_valid 
          ? `I extracted the details for ${result.extracted?.item || 'your requisition'}. Please review before creating the purchase request.`
          : "I need a few details reviewed before this request can be created."
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      if (currentReqId !== requestIdCounter.current) return;

      const errorMsg: Message = {
        id: getNextMessageId(),
        role: "system",
        content: isApiError(err) ? err.detail : "Failed to connect to the assistant. Please try again."
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      if (currentReqId === requestIdCounter.current) {
        setIsExtracting(false);
      }
    }
  };

  const handleCreated = (pr: PurchaseRequest) => {
    const reqIdentifier = pr.id || pr.request_code;
    toast.success(`Purchase request ${pr.request_code || ''} created successfully! Redirecting to supplier selection...`);
    setActiveExtraction(null);
    setRefreshTrigger(prev => prev + 1);
    
    setMessages(prev => [
      ...prev,
      {
        id: getNextMessageId(),
        role: "system",
        content: `Purchase request ${pr.request_code} has been successfully validated. Taking you to Supplier Intelligence...`
      }
    ]);

    // Immediate navigation to supplier recommendation page
    router.push(`/procurement/suppliers?reqId=${encodeURIComponent(reqIdentifier)}`);
  };

  return (
    <AppShell title="AI Procurement Assistant">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
        
        {/* Page Header with Proper Offset and Crisp Typography */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Conversational Requisition</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Describe what you need; the assistant extracts and validates a purchase request.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              <span className="size-1.5 bg-emerald-500 animate-pulse" />
              Autonomous Agent Ready
            </span>
          </div>
        </div>

        {/* Balanced Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: AI Assistant Chat Panel */}
          <div className="lg:col-span-7 flex flex-col border border-border bg-card shadow-xs min-h-[580px] lg:min-h-[640px] max-h-[calc(100vh-190px)] overflow-hidden">
            
            {/* Panel Header */}
            <div className="bg-muted/40 px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center bg-primary/10 text-primary border border-primary/20">
                  <Bot className="size-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-foreground">Procurement Assistant</h2>
                  <p className="text-[10px] text-muted-foreground">Natural language to purchase request</p>
                </div>
              </div>
            </div>
            
            {/* Conversation History Viewport */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
              ))}
              
              {isExtracting && (
                <div className="flex items-center gap-2.5 text-muted-foreground p-3 bg-muted/30 border border-border">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span className="text-xs font-medium">Extracting requisition details...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions & Single Aligned Composer */}
            <div className="p-3.5 sm:p-4 border-t border-border bg-muted/20 shrink-0">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="size-3 text-primary" />
                <span className="text-[11px] font-semibold text-muted-foreground">Quick Suggestions</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(suggestion)}
                    disabled={isExtracting}
                    className="text-[11px] font-medium bg-background hover:bg-primary/5 hover:border-primary/40 hover:text-primary transition-all duration-150 px-2.5 py-1.5 border border-border text-muted-foreground text-left disabled:opacity-50 shadow-2xs cursor-pointer"
                  >
                    &quot;{suggestion}&quot;
                  </button>
                ))}
              </div>
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(input); }} 
                className="flex gap-2 items-stretch"
              >
                <div className="relative flex-1">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your request here (e.g. I need 12 mobile phones for Baksa by next Tuesday)..."
                    className="flex min-h-[52px] h-[52px] w-full border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none shadow-xs transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(input);
                      }
                    }}
                    disabled={isExtracting}
                  />
                </div>
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!input.trim() || isExtracting}
                  className="h-[52px] w-12 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs flex items-center justify-center transition-all cursor-pointer"
                >
                  <Send className="size-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground/80 mt-1.5 pl-0.5">
                Press <kbd className="font-mono bg-muted px-1 py-0.5 text-[9px] border border-border">Enter</kbd> to submit, <kbd className="font-mono bg-muted px-1 py-0.5 text-[9px] border border-border">Shift + Enter</kbd> for new line
              </p>
            </div>
          </div>

          {/* Right Rail: Action Review & Recent Requisitions */}
          <div className="lg:col-span-5 flex flex-col gap-5 items-stretch">
            <AnimatePresence mode="popLayout">
              {activeExtraction && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <RequisitionReviewCard 
                    extraction={activeExtraction} 
                    onCreated={handleCreated}
                    onCancel={() => setActiveExtraction(null)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-full">
              <RecentRequests requests={recentRequests} refreshTrigger={refreshTrigger} />
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}

export default AIProcurementPage;