import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import clsx from "clsx";

import { useTheme } from "../theme/ThemeProvider";
import { glassCardMotion } from "../utils/motion";

interface CardProps extends HTMLMotionProps<"div"> {
  interactive?: boolean;
  padded?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, children, interactive = true, padded = true, ...props },
  ref,
) {
  const { prefersReducedMotion } = useTheme();
  const shouldAnimate = interactive && !prefersReducedMotion;
  const resolvedClassName = typeof className === "string" ? className : undefined;

  return (
    <motion.div
      ref={ref}
      initial={shouldAnimate ? glassCardMotion.initial : false}
      animate={shouldAnimate ? glassCardMotion.animate : undefined}
      whileHover={shouldAnimate ? glassCardMotion.hover : undefined}
      className={clsx(
        "relative overflow-hidden rounded-glass border border-border-glass/70 bg-surface-glass shadow-glass backdrop-blur-xl transition-colors duration-300",
        interactive ? "[transform-style:preserve-3d]" : "",
        padded ? "p-6" : "",
        resolvedClassName,
      )}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-accent-primary/10"
      />
      <div className="relative z-[1]">{children as ReactNode}</div>
    </motion.div>
  );
});

type CardSectionProps = HTMLAttributes<HTMLDivElement>;

export function CardHeader({ className, ...props }: CardSectionProps) {
  return <div className={clsx("mb-4 flex flex-col gap-2", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={clsx("text-xl font-semibold text-text-primary", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={clsx("text-sm text-text-secondary", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: CardSectionProps) {
  return <div className={clsx("flex flex-col gap-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardSectionProps) {
  return <div className={clsx("mt-4 flex items-center justify-between gap-4", className)} {...props} />;
}
