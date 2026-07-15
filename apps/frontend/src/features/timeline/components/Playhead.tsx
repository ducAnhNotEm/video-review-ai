import React from 'react';
import { useStore } from '../../../store/useStore';

interface PlayheadProps {
  pxPerMs: number;
}

export const Playhead: React.FC<PlayheadProps> = ({ pxPerMs }) => {
  const currentTimeMs = useStore((state) => state.currentTimeMs);
  const left = currentTimeMs * pxPerMs;

  return (
    <div
      style={{
        transform: `translateX(${left}px)`,
      }}
      className="absolute top-0 bottom-0 w-[2px] bg-rose-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(244,63,94,0.8)] transition-transform duration-75 ease-out"
    >
      {/* Visual Playhead Handle on ruler top */}
      <div className="absolute -top-[1px] -left-[7px] w-[16px] h-[10px] bg-rose-500 border-b border-rose-600 rounded-b-md shadow-md cursor-ew-resize flex items-center justify-center">
        <div className="h-[4px] w-[2px] bg-rose-200/50 rounded-full" />
      </div>
    </div>
  );
};
