import React, { useRef, useState } from 'react';
import { Timeline, Clip } from 'shared';
import { useStore } from '../../store/useStore';
import { TimelineRuler } from './TimelineRuler';
import { TrackRow } from './TrackRow';
import { Playhead } from './Playhead';
import { 
  ZoomIn, ZoomOut, Film, Music, Type, Lock, Eye, Trash2 
} from 'lucide-react';

interface TimelineContainerProps {
  timeline: Timeline;
  selectedClipId: string | null;
  onSelectClip: (clip: Clip) => void;
  onDeleteTrack?: (trackId: string) => void;
  onSeek: (ms: number) => void;
}

export const TimelineContainer: React.FC<TimelineContainerProps> = ({
  timeline,
  selectedClipId,
  onSelectClip,
  onDeleteTrack,
  onSeek
}) => {
  const { zoom, setZoom } = useStore();
  const pxPerMs = 0.05 * zoom;

  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const rulerContainerRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 0.5, 5));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 0.25, 0.25));
  };

  const handleTimelineInteraction = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = rulerContainerRef.current;
    if (!container || timeline.durationMs === 0) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left + container.scrollLeft;
    const computedMs = Math.max(0, Math.min(timeline.durationMs, clickX / pxPerMs));
    onSeek(Math.round(computedMs));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    handleTimelineInteraction(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    handleTimelineInteraction(e);
  };

  const handleMouseUpOrLeave = () => {
    setIsScrubbing(false);
  };

  // Sync scroll positions between the timeline ruler header and the tracks container
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const source = e.currentTarget;
    const target = source === tracksContainerRef.current 
      ? rulerContainerRef.current 
      : tracksContainerRef.current;
      
    if (target && target.scrollLeft !== source.scrollLeft) {
      target.scrollLeft = source.scrollLeft;
    }
  };

  const getTrackIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Film className="h-3.5 w-3.5 text-blue-400" />;
      case 'audio':
        return <Music className="h-3.5 w-3.5 text-emerald-400" />;
      case 'subtitle':
        return <Type className="h-3.5 w-3.5 text-purple-400" />;
      default:
        return <Film className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#090d16]/65 border-t border-slate-900 overflow-hidden select-none">
      
      {/* 1. Zoom and ruler status controls */}
      <div className="h-10 px-4 border-b border-slate-900 flex items-center justify-between bg-slate-950/30 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Track Editor</span>
        </div>

        {/* Zoom factors */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] font-mono font-semibold px-2 text-slate-400 min-w-[36px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Main Timeline Split Editor */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Track Headers Column */}
        <div className="w-32 border-r border-slate-900 bg-slate-950/20 flex flex-col z-10 shrink-0">
          {/* Header Spacer matching TimelineRuler height */}
          <div className="h-10 border-b border-slate-900/80 bg-slate-950/40" />

          {/* Individual Track Headers */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {timeline.tracks.map((track) => (
              <div 
                key={track.id} 
                className="h-12 border-b border-slate-900/60 px-2 flex items-center justify-between text-[10px] font-bold text-slate-400 group"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {getTrackIcon(track.type)}
                  <span className="truncate block select-none uppercase tracking-wide text-slate-300 max-w-[56px]">
                    {track.name}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                  <button className="p-0.5 rounded hover:bg-slate-900 hover:text-slate-200">
                    <Eye className="h-3 w-3" />
                  </button>
                  <button className="p-0.5 rounded hover:bg-slate-900 hover:text-slate-200">
                    <Lock className="h-3 w-3" />
                  </button>
                  {onDeleteTrack && (
                    <button
                      onClick={() => onDeleteTrack(track.id)}
                      className="p-0.5 rounded hover:bg-slate-900 hover:text-rose-400"
                      title="Delete Track"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Scrollable Timeline Area (Ruler + Tracks) */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* A. Time graduation ruler header */}
          <div
            ref={rulerContainerRef}
            onScroll={handleScroll}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className="h-10 overflow-x-auto overflow-y-hidden border-b border-slate-900/80 scrollbar-none cursor-ew-resize relative"
          >
            <TimelineRuler 
              durationMs={timeline.durationMs} 
              pxPerMs={pxPerMs} 
            />
            {/* Playhead handle overlays on the ruler container */}
            {timeline.durationMs > 0 && <Playhead pxPerMs={pxPerMs} />}
          </div>

          {/* B. Visual Track Rows grid */}
          <div
            ref={tracksContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-auto relative"
          >
            {/* Playhead line overlays on the track rows background */}
            {timeline.durationMs > 0 && <Playhead pxPerMs={pxPerMs} />}

            <div 
              style={{ width: `${timeline.durationMs * pxPerMs}px` }} 
              className="flex flex-col relative h-full min-h-[144px]"
            >
              {timeline.tracks.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  pxPerMs={pxPerMs}
                  selectedClipId={selectedClipId}
                  onSelectClip={onSelectClip}
                />
              ))}
              
              {/* Background grid canvas markings */}
              <div className="absolute inset-0 pointer-events-none border-r border-dashed border-slate-900/30" />
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
