"use client";

import React, { useRef } from "react";
import { ArrowRight, CalendarCheck, MapPin, ShieldCheck, Sparkles, Star } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

const spring = { type: "spring", stiffness: 100, damping: 20 } as const;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: spring,
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: spring,
  },
};

const cards = [
  {
    title: "Verified local teachers",
    detail: "Identity, credentials, reviews, and real availability in one premium profile.",
    icon: ShieldCheck,
    tone: "bg-[#E6F4EE] text-[#00694c]",
    metric: "4.9",
    meta: "avg rating",
  },
  {
    title: "Book the right first lesson",
    detail: "Students compare price, fit, location, and intro slots before committing.",
    icon: CalendarCheck,
    tone: "bg-[#FFF2D9] text-amber-700",
    metric: "45m",
    meta: "intro lesson",
  },
  {
    title: "Near you or online",
    detail: "Search by neighborhood, discipline, format, and trusted marketplace signals.",
    icon: MapPin,
    tone: "bg-[#EAF0FF] text-indigo-700",
    metric: "2 km",
    meta: "nearby match",
  },
];

export function ProductMotionHero({
  className,
  eyebrow = "Pratiqo marketplace",
  title = "Find a trusted teacher without the back-and-forth.",
  subtitle = "A premium local marketplace experience for comparing teachers, checking trust signals, and booking the first lesson with confidence.",
  primaryCta = "Explore teachers",
  secondaryCta = "Become a teacher",
  onPrimaryClick,
  onSecondaryClick,
}: {
  className?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  primaryCta?: string;
  secondaryCta?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start end", "end start"],
  });

  const cardY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [34, -42]);
  const cardYSlow = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [18, -26]);
  return (
    <section
      ref={heroRef}
      className={cn(
        "overflow-hidden bg-[#F6F3EA] px-4 py-16 text-[#2C2C2A] sm:px-6 lg:px-8",
        className,
      )}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.32 }}
        className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1fr)]"
      >
        <div className="space-y-8">
          <motion.div variants={fadeUpVariants} className="inline-flex items-center gap-2 rounded-full border border-[#DCEAE3] bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#00694c] shadow-[0_10px_30px_rgba(44,44,42,0.06)]">
            <Sparkles size={14} aria-hidden />
            {eyebrow}
          </motion.div>

          <div className="space-y-5">
            <motion.h1 variants={fadeUpVariants} className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-normal sm:text-5xl lg:text-6xl">
              {title}
            </motion.h1>
            <motion.p variants={fadeUpVariants} className="max-w-2xl text-base leading-7 text-neutral-700 sm:text-lg">
              {subtitle}
            </motion.p>
          </div>

          <motion.div variants={fadeUpVariants} className="flex flex-col gap-3 sm:flex-row">
            <motion.button
              type="button"
              onClick={onPrimaryClick}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              whileFocus={{ scale: 1.01 }}
              transition={spring}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#00694c] px-6 text-sm font-bold text-white shadow-[0_16px_40px_rgba(0,105,76,0.22)] outline-none transition-colors hover:bg-[#008560] focus-visible:ring-4 focus-visible:ring-[#00694c]/20"
              style={{ willChange: "transform" }}
            >
              {primaryCta}
              <ArrowRight size={17} aria-hidden />
            </motion.button>
            <motion.button
              type="button"
              onClick={onSecondaryClick}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              whileFocus={{ scale: 1.01 }}
              transition={spring}
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#D2DED7] bg-white px-6 text-sm font-bold text-[#2C2C2A] shadow-[0_12px_34px_rgba(44,44,42,0.07)] outline-none transition-colors hover:border-[#00694c]/30 focus-visible:ring-4 focus-visible:ring-[#00694c]/15"
              style={{ willChange: "transform" }}
            >
              {secondaryCta}
            </motion.button>
          </motion.div>
        </div>

        <motion.div variants={fadeUpVariants} className="relative min-h-[520px]">
          <motion.div
            className="absolute left-0 top-10 w-[min(92vw,420px)] rounded-[28px] border border-[#DCEAE3] bg-white p-5 shadow-[0_30px_90px_rgba(44,44,42,0.16)]"
            style={{ y: cardYSlow, willChange: "transform" }}
            variants={cardVariants}
            whileHover={{ y: -6, rotate: -0.6, scale: 1.015 }}
            whileTap={{ scale: 0.99 }}
            whileFocus={{ scale: 1.01 }}
            transition={spring}
            tabIndex={0}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#00694c]">Top match</p>
                <h2 className="mt-2 text-2xl font-bold">Maya R.</h2>
                <p className="mt-1 text-sm text-neutral-700">Math tutor · Montreal · Online or nearby</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00694c] text-lg font-bold text-white">MR</div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Identity verified", "Diploma checked", "Responds fast"].map((label) => (
                <span key={label} className="rounded-full bg-[#F3FAF6] px-3 py-1 text-xs font-bold text-[#00694c]">
                  {label}
                </span>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                ["$42", "per hour"],
                ["4.9", "rating"],
                ["18", "reviews"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-[#E8E6DE] bg-[#FAFCFB] p-3">
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-xs text-neutral-600">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="absolute bottom-0 right-0 grid w-[min(92vw,460px)] gap-4">
            {cards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.article
                  key={card.title}
                  variants={cardVariants}
                  whileHover={{ x: -6, y: -4, scale: 1.012 }}
                  whileTap={{ scale: 0.99 }}
                  whileFocus={{ scale: 1.01 }}
                  transition={spring}
                  tabIndex={0}
                  className="group rounded-3xl border border-[#DCEAE3] bg-white/95 p-4 shadow-[0_18px_54px_rgba(44,44,42,0.10)] outline-none backdrop-blur transition-colors focus-visible:ring-4 focus-visible:ring-[#00694c]/15"
                  style={{
                    y: index === 1 ? cardY : cardYSlow,
                    willChange: "transform",
                    transform: "translateZ(0)",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", card.tone)}>
                      <Icon size={21} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="truncate text-sm font-bold text-[#2C2C2A]">{card.title}</h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF7E6] px-2 py-1 text-xs font-bold text-amber-700">
                          <Star size={12} className="fill-amber-400 text-amber-400" aria-hidden />
                          {card.metric}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-neutral-700">{card.detail}</p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">{card.meta}</p>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
