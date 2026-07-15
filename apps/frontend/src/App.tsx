import React, { useEffect, useState, useRef } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from './store/useStore';
import { ScriptNode, SubtitleNode, CompileNode } from './components/AgentNodes';
import { TimelineContainer } from './components/timeline/TimelineContainer';
import { Clip } from 'shared';
import { 
  Play, Pause, Plus, Upload, Trash2, Sparkles, Film, 
  Cpu, Languages, RefreshCw, MessageSquare, Video
} from 'lucide-react';

const nodeTypes = {
  ScriptNode,
  SubtitleNode,
  CompileNode
};

export default function App() {
  const {
    projects, activeProject, timeline, nodes, edges, isPlaying, currentTimeMs, isLoading,
    fetchProjects, createProject, selectProject, deleteProject,
    transcribeProject, generateScript, renderVideo, setIsPlaying, setCurrentTimeMs
  } = useStore();

  const [newProjectName, setNewProjectName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [agentPrompt, setAgentPrompt] = useState('');
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'ollama'>('gemini');
  const [whisperModel, setWhisperModel] = useState('base');
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize
  useEffect(() => {
    fetchProjects();
  }, []);

  // Update playhead based on video time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTimeMs(Math.floor(video.currentTime * 1000));
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [activeProject]);

  // Sync state playhead to video currentTime
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleSeek = (ms: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = ms / 1000;
    }
    setCurrentTimeMs(ms);
  };

  const handleNodeClick = (_event: React.MouseEvent, node: any) => {
    if (!activeProject) return;
    if (node.id === 'script') {
      if (agentPrompt.trim()) {
        generateScript(agentPrompt, provider);
      } else {
        alert('Please write an agent prompt in the sidebar first to trigger script generation!');
      }
    } else if (node.id === 'subtitle') {
      if (activeProject.inputVideoPath) {
        transcribeProject(whisperModel);
      } else {
        alert('Project has no input video file to transcribe.');
      }
    } else if (node.id === 'compile') {
      if (timeline && timeline.tracks.length > 0) {
        renderVideo();
      } else {
        alert('Timeline is empty. Please transcribe or configure tracks before rendering.');
      }
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      await createProject(newProjectName, selectedFile);
      setNewProjectName('');
      setSelectedFile(null);
    } catch (err) {
      console.error(err);
    }
  };

  const activeVideoUrl = activeProject?.outputVideoPath 
    ? `media://${activeProject.outputVideoPath}` 
    : activeProject?.inputVideoPath 
      ? `media://${activeProject.inputVideoPath}` 
      : '';

  return (
    <div className="flex h-screen w-screen bg-[#070a13] text-slate-100 font-sans overflow-hidden">
      
      {/* 1. Projects Sidebar */}
      <div className="w-80 border-r border-slate-900 bg-[#090d16]/80 flex flex-col h-full">
        <div className="p-4 border-b border-slate-900 flex items-center gap-2">
          <Film className="h-6 w-6 text-blue-500 animate-pulse" />
          <h1 className="text-lg font-bold tracking-wider bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            AI Video Agent
          </h1>
        </div>

        {/* Create Project Form */}
        <form onSubmit={handleCreateProject} className="p-4 border-b border-slate-900 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Project Name..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-800 focus:outline-none focus:border-blue-500"
          />
          <div className="flex items-center justify-between gap-2">
            <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 cursor-pointer text-slate-300">
              <Upload className="h-4 w-4 text-slate-400" />
              {selectedFile ? selectedFile.name.substring(0, 12) + '...' : 'Upload Video'}
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Create
            </button>
          </div>
        </form>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Projects</h3>
          {isLoading && projects.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading list...
            </div>
          ) : (
            projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => selectProject(proj.id)}
                className={`p-3 rounded-xl cursor-pointer transition-all duration-200 border flex justify-between items-center group ${
                  activeProject?.id === proj.id
                    ? 'bg-blue-600/10 border-blue-500/50 shadow-md shadow-blue-500/5'
                    : 'bg-slate-950/40 border-slate-900 hover:border-slate-800'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-200 truncate">{proj.name}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{new Date(proj.createdAt).toLocaleDateString()}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProject(proj.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-900 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Center Workspace (Flow + Player + Timeline) */}
      <div className="flex-1 flex flex-col h-full bg-[#04060b]">
        
        {/* Top: Agent Flow Graph */}
        <div className="h-[280px] border-b border-slate-900 relative">
          <div className="absolute top-3 left-4 z-10 bg-slate-950/80 border border-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <Cpu className="h-4 w-4 text-purple-400 animate-spin" /> AI Agent Pipeline Nodes
          </div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1e293b" gap={16} />
            <Controls className="!bg-slate-900 !border-slate-800 !text-slate-100" />
          </ReactFlow>
        </div>

        {/* Mid: Video Preview Display */}
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

        {/* Bottom: Timeline Editor */}
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
          <div className="h-64 border-t border-slate-900 bg-[#090d16]/75 flex items-center justify-center text-xs text-slate-600 shrink-0">
            Timeline is currently empty. Run transcription to build tracks automatically.
          </div>
        )}
      </div>

      {/* 3. AI Agent Command Sidebar */}
      <div className="w-80 border-l border-slate-900 bg-[#090d16]/80 flex flex-col h-full">
        <div className="p-4 border-b border-slate-900 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-purple-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">AI Agent Command Center</h2>
        </div>

        {/* Configuration settings */}
        <div className="p-4 border-b border-slate-900 flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">LLM Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:border-purple-500 text-slate-200"
            >
              <option value="gemini">Gemini API (flash)</option>
              <option value="openai">OpenAI API (gpt-4o-mini)</option>
              <option value="ollama">Ollama (local models)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Whisper Model size</label>
            <select
              value={whisperModel}
              onChange={(e) => setWhisperModel(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:border-purple-500 text-slate-200"
            >
              <option value="tiny">Tiny (Very light)</option>
              <option value="base">Base (Balanced)</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
            </select>
          </div>
        </div>

        {/* Command Prompter */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Prompt Agent for Script & B-roll</label>
              <textarea
                value={agentPrompt}
                onChange={(e) => setAgentPrompt(e.target.value)}
                placeholder="Describe your video theme or copy script script..."
                rows={5}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:outline-none focus:border-purple-500 resize-none text-slate-300"
              />
            </div>
            
            <button
              onClick={() => generateScript(agentPrompt, provider)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-600/10 flex items-center justify-center gap-1.5"
              disabled={!activeProject || !agentPrompt.trim()}
            >
              <Sparkles className="h-4 w-4" /> Generate Video Script
            </button>

            {activeProject?.script && (
              <div className="mt-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Generated Script</label>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-900 text-xs text-slate-300 max-h-48 overflow-y-auto leading-relaxed">
                  {activeProject.script}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-slate-900/60">
            <button
              onClick={() => transcribeProject(whisperModel)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5"
              disabled={!activeProject || !activeProject.inputVideoPath}
            >
              <Languages className="h-4 w-4 text-purple-400" /> Transcribe Original Video
            </button>

            <button
              onClick={renderVideo}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-1.5"
              disabled={!activeProject || !timeline || timeline.tracks.length === 0}
            >
              <Cpu className="h-4 w-4" /> Render final Video MP4
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
