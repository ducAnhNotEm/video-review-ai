import { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { AssetLibrary } from '../../assets/components/AssetLibrary';
import { FlowEditor } from '../../workflow/components/FlowEditor';
import { VideoPlayer } from '../../player/components/VideoPlayer';
import { AICommandCenter } from './AICommandCenter';
import { TimelineContainer } from '../../timeline/components/TimelineContainer';
import { playerManager } from '../../player/playerManager';
import { Clip } from 'shared';

export function WorkspaceLayout() {
  const { timeline, fetchProjects } = useStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const [agentPrompt, setAgentPrompt] = useState('');
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'ollama'>('gemini');
  const [whisperModel, setWhisperModel] = useState('base');
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);

  const handleSeek = (ms: number) => {
    playerManager.seek(ms);
  };

  return (
    <div className="flex h-screen w-screen bg-[#070a13] text-slate-100 font-sans overflow-hidden">
      {/* Left Sidebar: Media Assets & Projects */}
      <AssetLibrary />

      {/* Middle Workspace: Flow Editor, Video Player, Timeline */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#04060b]">
        {/* React Flow Visual Node Editor */}
        <FlowEditor
          agentPrompt={agentPrompt}
          provider={provider}
          whisperModel={whisperModel}
        />

        {/* Video Player Display */}
        <VideoPlayer />

        {/* Timeline Editor */}
        {timeline ? (
          <div className="h-64 shrink-0">
            <TimelineContainer
              timeline={timeline}
              selectedClipId={selectedClip?.id || null}
              onSelectClip={(clip) => setSelectedClip(clip)}
              onSeek={handleSeek}
            />
          </div>
        ) : (
          <div className="h-64 border-t border-slate-900 bg-[#090d16]/75 flex items-center justify-center text-xs text-slate-600 shrink-0 select-none">
            Timeline is currently empty. Run transcription to build tracks automatically.
          </div>
        )}
      </div>

      {/* Right Sidebar: AI Command Center configuration */}
      <AICommandCenter
        agentPrompt={agentPrompt}
        setAgentPrompt={setAgentPrompt}
        provider={provider}
        setProvider={setProvider}
        whisperModel={whisperModel}
        setWhisperModel={setWhisperModel}
      />
    </div>
  );
}
