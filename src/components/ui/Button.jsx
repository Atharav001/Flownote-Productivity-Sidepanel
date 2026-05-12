import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", asChild = false, children, ...props }, ref) => {
    
    const variants = {
      default: "bg-white/10 hover:bg-white/15 text-white shadow-sm border border-white/5",
      primary: "bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/20 border border-indigo-400/30",
      ghost: "hover:bg-white/5 text-graphite-300 hover:text-white",
      icon: "p-2 hover:bg-white/10 rounded-full text-graphite-400 hover:text-white",
    };

    const sizes = {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-10 rounded-lg px-8",
      icon: "h-8 w-8 flex items-center justify-center p-0",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-graphite-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
