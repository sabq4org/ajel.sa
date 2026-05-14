"use client";

import { useEffect, useState } from "react";

/**
 * شريط تقدم القراءة — ينمو من اليمين لليسار حسب موضع التمرير
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percent = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      setProgress(percent);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent pointer-events-none">
      <div
        className="h-full bg-gradient-to-l from-burgundy via-burgundy-dark to-burgundy dark:from-rose-400 dark:via-rose-500 dark:to-rose-400 transition-[width] duration-100 shadow-red"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
