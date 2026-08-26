"use client";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      ref={hostRef}
      className={`spark-badge ${className}`.trim()}
      data-state={mounted ? "ready" : "loading"}
      data-variant="badge"
    >
      {mounted ? (
        <iframe
          className="spark-badge__frame is-ready"
          title="Animated credential badge in rain"
          {...(sourceUrl ? { src: sourceUrl } : { srcDoc: SPARK_BADGE_MARKUP })}
          sandbox="allow-scripts allow-same-origin"
          loading="eager"
        />
      ) : null}
    </div>
  );
}

export default SparkBadge;
