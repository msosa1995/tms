import { useState, useEffect, useRef } from "react";

export default function useCountUp(target, duration = 1400) {
  const [value, setValue] = useState(0);
  const rafRef  = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (typeof target !== "number") return;
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}
