import React from "react";
import { motion } from "framer-motion";
import { FileText, MoreHorizontal } from "lucide-react";
import { Button } from "../ui/Button";

export function NoteCard({ title, excerpt, date, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      className="group relative flex flex-col gap-2 p-4 rounded-xl glass-panel hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-[#818cf8]">
          <FileText className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">{date}</span>
        </div>
        <Button variant="icon" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>
      
      <div>
        <h4 className="text-base font-medium text-[#fafafa] mb-1 line-clamp-1">{title}</h4>
        <p className="text-sm text-[#a1a1aa] line-clamp-2 leading-relaxed">
          {excerpt}
        </p>
      </div>
    </motion.div>
  );
}
