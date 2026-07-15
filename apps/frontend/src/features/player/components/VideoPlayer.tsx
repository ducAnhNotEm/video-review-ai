import { useEffect, useRef } from 'react';
import { useStore } from '../../../store/useStore';
import { playerManager } from '../playerManager';
import { Play, Pause, Video } from 'lucide-react';

export function VideoPlayer() {
  const {
    activeProject,
    timeline,
    isPlaying,
    currentTimeMs,
    setIsPlaying,
    setCurrentTimeMs
  } = useStore();

  const videoRef = useRef<HTMLVideoElement>(null);

  // Expose the video element to playerManager
  useEffect(() => {
    if (videoRef.current) {
      playerManager.videoElement = videoRef.current;
    }
    return () => {
      playerManager.videoElement = null;
    };
  }, [activeProject]);

  // Sync state playhead to video currentTime
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTimeMs(Math.floor(video.currentTime * 1000));
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [activeProject]);

  // Reactively play/pause video when isPlaying changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      video.pause();
    }
  }, [isPlaying]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const activeVideoUrl = activeProject?.outputVideoPath 
    ? `media://${activeProject.outputVideoPath}` 
    : activeProject?.inputVideoPath 
      ? `media://${activeProject.inputVideoPath}` 
      : '';

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-950/20 relative">
      {activeVideoUrl ? (
        <div className="relative max-w-full max-h-full aspect-video rounded-xl overflow-hidden shadow-2xl shadow-black/80 border border-slate-900">
          <video
            ref={videoRef}
            src={activeVideoUrl}
            className="w-full h-full object-contain bg-black"
            controls={false}
          />
          {/* Custom Overlay Subtitle rendering (FabricJS Simulation) */}
          <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none px-4">
            {timeline?.tracks.find(t => t.type === 'subtitle')?.clips.map((clip) => {
              const isVisible = currentTimeMs >= clip.timelineStartMs && currentTimeMs <= (clip.timelineStartMs + clip.durationMs);
              if (!isVisible) return null;
              return (
                <span 
                  key={clip.id}
                  style={{
                    fontSize: `${clip.textConfig?.fontSize || 24}px`,
                    color: clip.textConfig?.fontColor || '#ffffff',
                    fontFamily: clip.textConfig?.fontFamily || 'Arial',
                    fontWeight: clip.textConfig?.bold ? 'bold' : 'normal',
                    backgroundColor: 'rgba(0,0,0,0.65)'
                  }}
                  className="px-3 py-1.5 rounded"
                >
                  {clip.textConfig?.content}
                </span>
              );
            })}
          </div>

          {/* Mini overlay Play Control */}
          <div className="absolute inset-0 bg-transparent flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handlePlayPause}
              className="p-4 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-white hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-0.5" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-slate-600 flex flex-col items-center gap-2">
          <Video className="h-12 w-12 text-slate-700" />
          <p className="text-sm font-medium">Select a project or upload a video clip to begin editing.</p>
        </div>
      )}
    </div>
  );
}
