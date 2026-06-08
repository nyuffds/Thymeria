"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedNumber({ value, className, style }: Props) {
  const prevValue = useRef(value);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (prevValue.current !== value) {
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 600);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <span
      className={(className ?? "") + (animating ? " animate-power-change inline-block" : "")}
      style={style}
    >
      {value}
    </span>
  );
}