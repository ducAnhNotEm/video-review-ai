// Shared data contracts and types for AI Video Agent platform

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  inputVideoPath?: string;
  outputVideoPath?: string;
  script?: string;
  status: 'idle' | 'transcribing' | 'generating_script' | 'rendering' | 'completed' | 'failed';
  errorMessage?: string;
}

export interface ProjectAsset {
  id: string;
  projectId: string;
  name: string;
  filePath: string;
  fileType: 'video' | 'audio' | 'image';
  durationMs?: number;
  createdAt: string;
}

export type TrackType = 'video' | 'audio' | 'subtitle' | 'overlay';

export interface Timeline {
  id: string;
  projectId: string;
  tracks: Track[];
  durationMs: number;
}

export interface Track {
  id: string;
  type: TrackType;
  name: string;
  order: number;
  clips: Clip[];
}

export interface Clip {
  id: string;
  trackId: string;
  name: string;
  filePath: string;
  // Timing in milliseconds relative to clip resource
  startOffsetMs: number;
  durationMs: number;
  // Position in milliseconds on the global timeline
  timelineStartMs: number;
  // Spatial transformations (mostly for video/overlay tracks)
  transform?: ClipTransform;
  // Custom properties for text overlays/subtitles
  textConfig?: TextConfig;
}

export interface ClipTransform {
  x: number; // percentage or absolute position
  y: number;
  width: number;
  height: number;
  opacity: number;
  scale: number;
}

export interface TextConfig {
  content: string;
  fontSize: number;
  fontColor: string;
  backgroundColor?: string;
  fontFamily: string;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
}

export interface Subtitle {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
}

// React Flow Agent Node Layout schemas
export type AgentNodeType = 'ScriptNode' | 'TTSNode' | 'BRollNode' | 'CompileNode' | 'SubtitleNode';

export interface AgentNode {
  id: string;
  type: AgentNodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    status: 'idle' | 'running' | 'completed' | 'failed';
    error?: string;
    config?: Record<string, any>;
  };
}

export interface AgentEdge {
  id: string;
  source: string;
  target: string;
}

export interface AgentState {
  nodes: AgentNode[];
  edges: AgentEdge[];
}

// Request and Response Contracts
export interface TranscribeRequest {
  videoPath: string;
  language?: string;
}

export interface TranscribeResponse {
  subtitles: Subtitle[];
  text: string;
}

export interface GenerateScriptRequest {
  prompt: string;
  provider: 'openai' | 'gemini' | 'ollama';
  modelName: string;
}

export interface GenerateScriptResponse {
  script: string;
  visualSuggestions: string[]; // B-roll advice
}

export interface CompileVideoRequest {
  projectId: string;
  timeline: Timeline;
}

export interface CompileVideoResponse {
  outputFilePath: string;
}

declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    }
  }
}

