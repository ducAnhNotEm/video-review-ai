import React from 'react';
import { Track, Clip } from 'shared';

interface TrackRowProps {
  track: Track;
  pxPerMs: number;
  selectedClipId: string | null;
  onSelectClip: (clip: Clip) => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({ track, pxPerMs, selectedClipId, onSelectClip }) => {
  const getClipColorClasses = (type: string, isSelected: boolean) => {
    if (isSelected) {
      return 'bg-blue-600/35 border-blue-400 text-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.2)]';
    }
    
    switch (type) {
      case 'video':
        return 'bg-blue-600/10 border-blue-500/40 text-blue-300 hover:bg-blue-600/20 hover:border-blue-400';
      case 'audio':
        return 'bg-emerald-600/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/20 hover:border-emerald-400';
      case 'subtitle':
        return 'bg-purple-600/10 border-purple-500/40 text-purple-300 hover:bg-purple-600/20 hover:border-purple-400';
      default:
        return 'bg-slate-600/10 border-slate-500/40 text-slate-300 hover:bg-slate-600/20 hover:border-slate-400';
    }
  };

  return (
    <div className="h-12 border-b border-slate-900/60 relative flex items-center group/row">
      {track.clips.map((clip) => {
        const left = clip.timelineStartMs * pxPerMs;
        const width = clip.durationMs * pxPerMs;
        const isSelected = selectedClipId === clip.id;

        return (
          <div
            key={clip.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectClip(clip);
            }}
            style={{
              left: `${left}px`,
              width: `${width}px`,
            }}
            className={`absolute top-1 bottom-1 rounded-lg border px-3 flex items-center text-xs font-medium cursor-pointer transition-all duration-200 truncate select-none ${getClipColorClasses(
              track.type,
              isSelected
            )}`}
          >
            <div className="flex flex-col min-w-0 w-full justify-center">
              <span className="truncate block font-semibold text-[10px]">
                {clip.name || (clip.textConfig?.content && `Sub: ${clip.textConfig.content}`)}
              </span>
              {clip.durationMs > 2000 && (
                <span className="text-[8px] opacity-60 font-mono block mt-0.5">
                  {((clip.durationMs) / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
