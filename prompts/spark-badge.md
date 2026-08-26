You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
spark-badge.tsx
import { useEffect, useRef, useState } from "react";
import { SPARK_BADGE_MARKUP } from "./spark-badge-utils/spark-badge-markup";

export type SparkBadgeVariant = "badge";
export type SparkBadgeProps = {
  className?: string;
  sourceUrl?: string;
  variant?: SparkBadgeVariant;
};

export function SparkBadge({ className = "", sourceUrl }: SparkBadgeProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const intersectsRef = useRef(true);
  const [mounted, setMounted] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const sync = () =>
      setMounted(
        intersectsRef.current && document.visibilityState !== "hidden",
      );
    const observer = new IntersectionObserver(
      ([entry]) => {
        intersectsRef.current = entry.isIntersecting;
        sync();
      },
      { rootMargin: "80px" },
    );
    observer.observe(host);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    if (!mounted) setReady(false);
  }, [mounted]);

  return (
    <div
      ref={hostRef}
      className={`spark-badge${className ? ` ${className}` : ""}`}
      data-state={!mounted ? "paused" : ready ? "ready" : "loading"}
      data-variant="badge"
    >
      {mounted ? (
        <iframe
          className={`spark-badge__frame${ready ? " is-ready" : ""}`}
          title="Animated credential badge in rain"
          {...(sourceUrl ? { src: sourceUrl } : { srcDoc: SPARK_BADGE_MARKUP })}
          sandbox="allow-scripts"
          loading="eager"
          onLoad={() => setReady(true)}
        />
      ) : null}
    </div>
  );
}

export default SparkBadge;


demo.tsx
import { SparkBadge } from "@/components/ui/spark-badge";

export default function SparkBadgeDemo() {
  return (
    <div style={{ width: "100%", aspectRatio: "1 / 1" }}>
      <SparkBadge />
    </div>
  );
}

```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them
