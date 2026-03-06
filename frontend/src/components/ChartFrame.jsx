import { useEffect, useRef, useState } from "react";

export const ChartFrame = ({ testId, children, height = 288, className = "" }) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height });

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.floor(entry.contentRect.width);
      const measuredHeight = Math.floor(entry.contentRect.height);
      if (width > 0) {
        setDimensions({ width, height: measuredHeight > 0 ? measuredHeight : height });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [height]);

  return (
    <div
      ref={containerRef}
      data-testid={testId}
      className={`min-w-0 w-full ${className}`}
      style={{ height: `${height}px` }}
    >
      {dimensions.width > 0 ? (
        children(dimensions)
      ) : (
        <p className="text-sm text-zinc-500" data-testid={`${testId}-loading`}>
          Ajustando gráfico...
        </p>
      )}
    </div>
  );
};
