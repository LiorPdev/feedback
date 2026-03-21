"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

interface AnimatedTokenCounterProps {
  value: number;
}

export default function AnimatedTokenCounter({ value }: AnimatedTokenCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    // If it's the first render (or prevValue is the same as value), do nothing
    if (prevValue.current === value) {
      return;
    }

    const controls = animate(prevValue.current, value, {
      duration: 2,
      ease: "easeOut",
      onUpdate(latest) {
        setDisplayValue(Math.round(latest));
      },
    });

    prevValue.current = value;
    return () => controls.stop();
  }, [value]);

  return <span>{displayValue}</span>;
}
