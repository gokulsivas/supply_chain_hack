"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Bot } from "lucide-react";
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
  "I need 100 laptops for Bangalore warehouse by August 20.",
  "Urgently procure 50 barcode scanners for Chennai by next Friday.",
  "Need 25 pallets of packaging material at Bengaluru DC next month."
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
  const [recentRequests, setRecentRequests] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    listPurchaseRequests().then((data) => {
      if (isMounted && Array.isArray(data)) {
        setRecentRequests(data);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isExtracting]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isExtracting) return;

    setInput("");
    setActiveExtraction(null);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setIsExtracting(true);

    try {
      const result = await extractRequisition(trimmed);
      setActiveExtraction(result);
      
      const assistantMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: result.is_valid 
          ? "I extracted the following request. Please review it before creating the purchase request."
          : "I need a few details corrected before this request can be created."
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: "system",
        content: isApiError(err) ? err.detail : "Failed to connect to the assistant. Please try again."
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsExtracting(false);
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
        id: Date.now().toString(),
        role: "system",
        content: `Purchase request ${pr.request_code} has been successfully validated. Taking you to Supplier Intelligence...`
      }
    ]);

    // Immediate navigation to supplier recommendation page
    router.push(`/procurement/suppliers?reqId=${encodeURIComponent(reqIdentifier)}`);
  };

  return (
    <AppShell title="AI procurement assistant">
      <div className="flex flex-col gap-6 max-w-[1440px] mx-auto w-full pb-12">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Conversational requisition</h1>
          <p className="text-muted-foreground">Describe what you need; the assistant extracts and validates a purchase request.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:h-[calc(100vh-200px)] lg:min-h-[600px]">
          
          {/* Chat Interface Column */}
          <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-sm lg:h-full">
            <div className="bg-muted px-4 py-3 border-b flex items-center gap-2">
              <Bot className="size-5 text-primary" />
              <h2 className="font-semibold">Procurement Assistant</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
              ))}
              
              {isExtracting && (
                <div className="flex items-center gap-3 text-muted-foreground p-4">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm">Extracting details...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-muted/20">
              <div className="flex flex-wrap gap-2 mb-3">
                {SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(suggestion)}
                    className="text-xs bg-muted hover:bg-primary/10 hover:text-primary transition-colors px-2.5 py-1.5 rounded-full border border-border text-muted-foreground text-left"
                  >
                    &quot;{suggestion}&quot;
                  </button>
                ))}
              </div>
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(input); }} 
                className="flex gap-2"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your request here..."
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(input);
                    }
                  }}
                  disabled={isExtracting}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!input.trim() || isExtracting}
                  className="h-auto w-12 shrink-0 self-stretch"
                >
                  <Send className="size-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </form>
            </div>
          </div>

          {/* Action Column */}
          <div className="flex flex-col gap-6 lg:h-full lg:overflow-y-auto lg:pr-2 pb-4">
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

            <div className="flex-1">
              <RecentRequests requests={recentRequests} refreshTrigger={refreshTrigger} />
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
