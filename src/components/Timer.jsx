// src/components/Timer.jsx
import React, { useState, useEffect } from "react";

export default function Timer({ minutes, onTimeUp }) {
  const [seconds, setSeconds] = useState(minutes * 60);

  useEffect(() => {
    if (seconds <= 0) {
      onTimeUp();
      return;
    }
    const timer = setInterval(() => setSeconds((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const displayMins = Math.floor(seconds / 60);
  const displaySecs = seconds % 60;

  return (
    <div
      className={`px-4 py-2 rounded-full font-mono font-bold 
      ${seconds < 60 ? "bg-red-100 text-red-600 animate-pulse" : "bg-slate-100 text-slate-700"}`}
    >
      {displayMins}:{displaySecs < 10 ? `0${displaySecs}` : displaySecs}
    </div>
  );
}
