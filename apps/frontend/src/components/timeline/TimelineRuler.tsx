import React from 'react';

interface TimelineRulerProps {
  durationMs: number;
  pxPerMs: number;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({ durationMs, pxPerMs }) => {
  // Determine standard tick intervals based on zoom scale
  // We want ticks to be spaced approximately 80px-150px apart
  const minSpacingPx = 80;
  const potentialIntervals = [100, 500, 1000, 2000, 5000, 10000, 30000, 60000]; // in ms
  
  let intervalMs = potentialIntervals[potentialIntervals.length - 1];
  for (const interval of potentialIntervals) {
    if (interval * pxPerMs >= minSpacingPx) {
      intervalMs = interval;
      break;
    }
  }

  const ticks: JSX.Element[] = [];
  const numTicks = Math.ceil(durationMs / intervalMs);

  const formatTime = (ms: number): string => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    const pad = (n: number) => ('0' + n).slice(-2);
    return `${pad(m)}:${pad(s)}`;
  };

  for (let i = 0; i <= numTicks; i++) {
    const timeMs = i * intervalMs;
    const leftOffset = timeMs * pxPerMs;

    ticks.push(
      <div
        key={i}
        style={{ left: `${leftOffset}px` }}
        className="absolute bottom-0 h-6 flex flex-col justify-between border-l border-slate-700/60"
      >
        <span className="text-[9px] text-slate-500 font-bold font-mono pl-1 select-none pointer-events-none">
          {formatTime(timeMs)}
        </span>
        {/* Draw sub-ticks */}
        <div className="flex w-full justify-between items-end px-[2px]">
          <div className="h-1 w-[1px] bg-slate-800" />
          <div className="h-1 w-[1px] bg-slate-800" />
          <div className="h-1 w-[1px] bg-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ width: `${durationMs * pxPerMs}px` }} 
      className="h-10 border-b border-slate-900 bg-slate-950/40 relative overflow-visible"
    >
      {ticks}
    </div>
  );
};
