import React from "react";
import { motion } from "framer-motion";
import { Circle, CheckCircle2 } from "lucide-react";
import { cn } from "../../lib/utils";

export function TaskCard({ title, completed = false, priority = "medium", index }) {
  const [isCompleted, setIsCompleted] = React.useState(completed);

  const priorityColors = {
    high: "bg-red-500/20 text-red-400 border-red-500/20",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/20",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.01, backgroundColor: "rgba(255, 255, 255, 0.03)" }}
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg border border-[rgba(255,255,255,0.04)] bg-[rgba(24,24,27,0.3)] transition-all cursor-pointer",
        isCompleted && "opacity-50"
      )}
      onClick={() => setIsCompleted(!isCompleted)}
    >
      <button className="mt-0.5 text-[#a1a1aa] hover:text-[#818cf8] transition-colors focus:outline-none">
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-[#818cf8]" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <span
          className={cn(
            "text-sm font-medium text-[#e4e4e7] truncate transition-all duration-300",
            isCompleted && "line-through text-[#71717a]"
          )}
        >
          {title}
        </span>
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border", priorityColors[priority])}>
            {priority}
          </span>
          <span className="text-[10px] text-[#52525b]">Today</span>
        </div>
      </div>
    </motion.div>
  );
}
