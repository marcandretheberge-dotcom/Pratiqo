"use client";

import { motion } from "motion/react";
import React from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex-1 flex flex-col min-h-full"
    >
      {children}
    </motion.div>
  );
}
