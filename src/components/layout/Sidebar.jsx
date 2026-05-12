import React from "react";
import { motion } from "framer-motion";
import { Search, Plus, Zap, Settings, Command } from "lucide-react";
import { Button } from "../ui/Button";

export function Sidebar({ children }) {
  return (
    <div className="flex flex-col h-screen w-full bg-[var(--color-graphite-950)] text-[var(--color-graphite-200)] relative">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-20%] w-96 h-96 bg-[#818cf8] rounded-full mix-blend-screen filter blur-[128px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-20%] w-96 h-96 bg-[#60a5fa] rounded-full mix-blend-screen filter blur-[128px] opacity-10 pointer-events-none"></div>

      {/* Header */}
      <header className="flex flex-col gap-4 p-4 z-10 border-b border-[var(--color-glass-border)] bg-[rgba(15,15,17,0.6)] backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#818cf8] to-[#60a5fa] flex items-center justify-center shadow-lg shadow-[#818cf8]/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[#fafafa] tracking-tight">MiniApp</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="icon" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="icon" size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Global Search Like Raycast */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-[#71717a] group-focus-within:text-[#818cf8] transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-12 py-2.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl text-sm text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:ring-2 focus:ring-[#818cf8]/50 focus:border-transparent transition-all shadow-inner"
            placeholder="Search or ask AI..."
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-[#71717a] border border-[#3f3f46]">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 z-10 flex flex-col gap-6">
        {children}
      </main>
    </div>
  );
}
