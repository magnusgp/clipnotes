import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Video } from "lucide-react";

import { useTheme } from "../theme/ThemeProvider";
import { fadeInUp, heroCardMotion, heroHeadlineMotion, staggerContainer } from "../utils/motion";
import { cn } from "../utils/cn";
import { Card } from "./Card";

interface HeroProps {
  className?: string;
}

export function Hero({ className }: HeroProps) {
  const { prefersReducedMotion } = useTheme();
  const shouldAnimate = !prefersReducedMotion;

  return (
    <section
      id="hero"
      className={cn(
        "relative overflow-hidden rounded-[3rem] border border-border-glass/60 bg-surface-glass/60 p-10 shadow-glass backdrop-blur-3xl",
        "before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.18),transparent_52%)]",
        "after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:bg-[linear-gradient(120deg,rgba(2,6,23,0.1),rgba(8,47,73,0.08),transparent_55%)]",
        className,
      )}
    >
      <motion.div
        variants={staggerContainer}
        initial={shouldAnimate ? "initial" : false}
        animate={shouldAnimate ? "animate" : undefined}
        className="grid gap-12 lg:grid-cols-[1.2fr,1fr]"
      >
        <div className="space-y-8">
          <motion.span
            variants={fadeInUp}
            className="inline-flex items-center gap-2 rounded-full border border-border-glass/80 bg-surface-glass/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-text-secondary/80"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Live demo ready
          </motion.span>

          <motion.div variants={heroHeadlineMotion} className="space-y-4">
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
              See What&apos;s Happening
            </h1>
            <p className="max-w-xl text-base text-text-secondary">
              ClipNotes turns raw training clips into a glassy monitoring console with live analysis, neon accents, and
              moments ready for playback. Switch themes instantly and watch Hafnia surface the narrative in real time.
            </p>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="flex flex-wrap items-center gap-3 text-sm"
          >
            <a
              href="#upload"
              className="group inline-flex items-center gap-2 rounded-full border border-transparent bg-text-primary px-5 py-2 font-medium text-surface-canvas transition-colors hover:bg-text-accent"
            >
              Get started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </a>
            <a
              href="#history"
              className="inline-flex items-center gap-2 rounded-full border border-border-glass bg-surface-glass/80 px-5 py-2 font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Browse sessions
            </a>
          </motion.div>

          <motion.dl variants={fadeInUp} className="grid gap-6 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-text-secondary/80">Latest latency</dt>
              <dd className="mt-1 text-2xl font-semibold text-text-accent">&lt; 5s</dd>
            </div>
            <div>
              <dt className="text-text-secondary/80">Clips analysed today</dt>
              <dd className="mt-1 text-2xl font-semibold text-text-accent">18</dd>
            </div>
            <div>
              <dt className="text-text-secondary/80">Theme preference</dt>
              <dd className="mt-1 text-2xl font-semibold text-text-accent">Instant</dd>
            </div>
          </motion.dl>
        </div>

        <motion.div
          variants={heroCardMotion}
          className="relative flex flex-col gap-4"
        >
          <Card className="h-full min-h-[18rem] overflow-hidden bg-surface-glass/80 p-0">
            <div className="relative h-full w-full overflow-hidden rounded-glass">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.28),transparent_60%)]" aria-hidden />
              <div className="relative flex h-full flex-col justify-between p-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary/90">Monitoring Loop</h3>
                  <p className="mt-2 max-w-xs text-sm text-text-secondary">
                    Uploads, Hafnia calls, session history, and reasoning comparison — wrapped in a polished shell.
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-border-glass/70 bg-surface-glass/80 p-4 text-sm text-text-secondary">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-secondary/70">Live insight</p>
                    <p className="text-lg font-semibold text-text-accent">Timeline unlocked</p>
                  </div>
                  <Video className="h-12 w-12 text-accent-primary/80" aria-hidden />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </section>
  );
}
