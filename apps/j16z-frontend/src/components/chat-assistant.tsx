"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Bot,
  Globe,
  Link as LinkIcon,
  Loader2,
  Send,
  Terminal,
  User,
} from "lucide-react";
import type { ChatMessage } from "@/lib/types";

export const ChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "0",
      role: "model",
      content:
        "J16Z ANALYST TERMINAL ONLINE.\nAwaiting query parameters for synthesis.",
      timestamp: 0, // Use 0 to avoid hydration mismatch
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeepResearch, setIsDeepResearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const mockResponse = (query: string, deep: boolean): string => {
    if (deep) {
      return [
        "[DEEP RESEARCH MOCK]",
        "- Consolidates filings, litigation, and prediction markets.",
        "- Highlights regulatory choke points and timing risk.",
        "- This is a local demo response, no external API calls made.",
      ].join("\n");
    }
    return [
      "[STANDARD MOCK] Parsed query:",
      `> ${query}`,
      "Key factors: counterparty quality, regulatory risk, spread vs. fair odds.",
      "(Demo-only output; production will call Gemini via server routes.)",
    ].join("\n");
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      setMessages((prev) => [
        ...prev,
        {
          id: "thinking",
          role: "model",
          content: "",
          timestamp: Date.now(),
          isThinking: true,
        },
      ]);

      await new Promise((resolve) => setTimeout(resolve, 700));

      const responseText = mockResponse(userMsg.content, isDeepResearch);

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== "thinking");
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            role: "model",
            content: responseText,
            timestamp: Date.now(),
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden border border-border bg-background font-mono">
      <div className="flex items-center justify-between border-b border-border bg-surface p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center border border-border bg-background text-primary-500">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-main">
              J16Z Analyst Agent
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-text-muted">
              <span>GEMINI-3-PRO (Mock)</span>
              <span>::</span>
              <span className="flex items-center gap-1 text-primary-500">
                <Globe className="h-3 w-3" /> GOOGLE SEARCH STYLE UI
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-wide ${
              isDeepResearch ? "text-primary-500" : "text-text-muted"
            }`}
          >
            Deep Think
          </span>
          <button
            onClick={() => setIsDeepResearch((v) => !v)}
            className={`flex h-4 w-8 items-center rounded-none border transition-colors ${
              isDeepResearch
                ? "justify-end border-primary-500 bg-primary-500/10"
                : "justify-start border-border bg-background"
            }`}
          >
            <span
              className={`h-3 w-3 bg-current ${
                isDeepResearch ? "text-primary-500" : "text-text-muted"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="scrollbar-thin scrollbar-thumb-border flex-1 space-y-6 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center border ${
                msg.role === "user"
                  ? "border-border bg-background text-text-muted"
                  : "border-primary-500/50 bg-primary-500/10 text-primary-500"
              }`}
            >
              {msg.role === "user" ? (
                <User className="h-3 w-3" />
              ) : (
                <Terminal className="h-3 w-3" />
              )}
            </div>
            <div
              className={`max-w-[85%] space-y-1 ${
                msg.role === "user" ? "text-right" : "text-left"
              }`}
            >
              <div
                className={`inline-block px-4 py-3 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "border border-border bg-surface text-text-main"
                    : "text-text-muted"
                }`}
              >
                {msg.isThinking && (
                  <div className="mb-3 flex items-center gap-2 border-b border-primary-500/20 pb-2 text-[10px] uppercase tracking-wider text-primary-500">
                    <div className="flex gap-1">
                      <span className="animate-bounce">●</span>
                      <span
                        className="animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      >
                        ●
                      </span>
                      <span
                        className="animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      >
                        ●
                      </span>
                    </div>
                    Thinking & Searching (Mock)...
                  </div>
                )}
                {msg.role === "model" && !msg.isThinking && msg.id !== "0" && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    <div className="flex items-center gap-1 rounded border border-border bg-surfaceHighlight px-2 py-0.5 text-[10px] text-text-dim">
                      <Globe className="h-3 w-3" />
                      <span>sec.gov</span>
                    </div>
                    <div className="flex items-center gap-1 rounded border border-border bg-surfaceHighlight px-2 py-0.5 text-[10px] text-text-dim">
                      <Globe className="h-3 w-3" />
                      <span>bloomberg.com</span>
                    </div>
                  </div>
                )}
                <pre className="max-w-full whitespace-pre-wrap font-mono text-xs">
                  {msg.content}
                </pre>
              </div>
              <span className="block px-1 text-[10px] uppercase tracking-widest text-text-dim">
                {msg.timestamp === 0 ? "--:--:--" : new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border bg-surface p-4">
        <div className="group relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={
              isDeepResearch
                ? "INITIATE DEEP RESEARCH (MOCK)..."
                : "QUERY DATABASE (MOCK)..."
            }
            className="w-full border border-border bg-background px-4 py-3 pr-12 text-xs uppercase text-text-main outline-none transition-colors placeholder:text-text-dim focus:border-primary-500"
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-text-muted transition-colors hover:text-primary-500 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="mt-2 flex justify-between px-1 text-[10px] text-text-dim">
          <span className="uppercase">
            Input Mode: {isDeepResearch ? "DEEP_THINK" : "STANDARD"}
          </span>
          <span className="flex items-center gap-1 uppercase">
            <LinkIcon className="h-3 w-3" /> Sources: AUTO (MOCK)
          </span>
        </div>
      </div>
    </div>
  );
};
