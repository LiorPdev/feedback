"use client";

import { useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

interface AnimatedTokenCounterProps {
  value: number;
}

export default function AnimatedTokenCounter({ value }: AnimatedTokenCounterProps) {
  const count = useMotionValue(value);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.2,
      ease: "easeOut",
    });
    return controls.stop;
  }, [value, count]);

  useEffect(() => {
    return rounded.on("change", (v) => setDisplayValue(v));
  }, [rounded]);

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      fontWeight: 800,
      fontVariantNumeric: "tabular-nums"
    }}>
      {displayValue}
    </span>
  );
}
