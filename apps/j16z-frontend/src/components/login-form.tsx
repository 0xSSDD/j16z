"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Loader2, ShieldCheck } from "lucide-react";

export const LoginForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/app");
    }, 1500);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 font-mono text-text-muted selection:bg-primary-500/20">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-20" />
        <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-20" />
      </div>

      <div className="group relative w-full max-w-md overflow-hidden border border-border bg-surface p-8 shadow-2xl">
        <div className="absolute left-0 top-0 h-px w-full -translate-x-full bg-gradient-to-r from-transparent via-primary-500 to-transparent group-hover:animate-[beam_2s_linear_infinite]" />

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-border bg-background text-primary-500">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="font-narrative text-2xl font-bold tracking-tight text-text-main">
            J16Z TERMINAL
          </h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-text-muted">
            Restricted Access // Authorized Personnel Only
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Analyst ID
            </label>
            <input
              type="text"
              defaultValue="david.analyst@j16z.com"
              className="w-full border border-border bg-background p-3 text-sm text-text-main outline-none transition-colors focus:border-primary-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Passkey
            </label>
            <input
              type="password"
              defaultValue="password"
              className="w-full border border-border bg-background p-3 text-sm text-text-main outline-none transition-colors focus:border-primary-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 border-none bg-text-main py-3 text-xs font-bold uppercase tracking-widest text-background transition-all hover:bg-text-muted hover:shadow-lg disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {loading ? "Authenticating..." : "Initialize Session"}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-text-muted opacity-60">
          <ShieldCheck className="h-3 w-3" />
          <span>256-BIT ENCRYPTION ENABLED</span>
        </div>
      </div>

      <div className="mt-8 text-[10px] text-text-muted opacity-40">
        SYSTEM ID: J16Z-AUTH-01 // LATENCY: 12ms
      </div>
    </div>
  );
};
