import { create } from 'zustand';
import { Project, Timeline, AgentNode, AgentEdge } from 'shared';

interface State {
  projects: Project[];
  activeProject: Project | null;
  timeline: Timeline | null;
  nodes: AgentNode[];
  edges: AgentEdge[];
  isPlaying: boolean;
  currentTimeMs: number;
  isLoading: boolean;
  error: string | null;
  zoom: number;

  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (name: string, file: File | null) => Promise<Project>;
  selectProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  saveTimeline: (timeline: Timeline) => Promise<void>;
  transcribeProject: (modelName?: string) => Promise<void>;
  generateScript: (prompt: string, provider: 'gemini' | 'openai' | 'ollama', modelName?: string) => Promise<void>;
  renderVideo: () => Promise<void>;
  setNodes: (nodes: AgentNode[] | ((nds: AgentNode[]) => AgentNode[])) => void;
  setEdges: (edges: AgentEdge[] | ((eds: AgentEdge[]) => AgentEdge[])) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTimeMs: (ms: number) => void;
  setZoom: (zoom: number) => void;
}

const defaultNodes: AgentNode[] = [
  {
    id: 'script',
    type: 'ScriptNode',
    position: { x: 50, y: 150 },
    data: { label: 'AI Script Agent', status: 'idle' }
  },
  {
    id: 'subtitle',
    type: 'SubtitleNode',
    position: { x: 300, y: 80 },
    data: { label: 'Whisper Transcribe', status: 'idle' }
  },
  {
    id: 'compile',
    type: 'CompileNode',
    position: { x: 550, y: 150 },
    data: { label: 'FFmpeg Compositor', status: 'idle' }
  }
];

const defaultEdges: AgentEdge[] = [
  { id: 'e1', source: 'script', target: 'compile' },
  { id: 'e2', source: 'subtitle', target: 'compile' }
];

export const useStore = create<State>((set, get) => ({
  projects: [],
  activeProject: null,
  timeline: null,
  nodes: defaultNodes,
  edges: defaultEdges,
  isPlaying: false,
  currentTimeMs: 0,
  isLoading: false,
  error: null,
  zoom: 1,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      set({ projects: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createProject: async (name, file) => {
    set({ isLoading: true, error: null });
    try {
      let absolutePath = undefined;

      if (file) {
        const formData = new FormData();
        formData.append('video', file);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        if (!uploadRes.ok) throw new Error('Upload failed');
        const uploadData = await uploadRes.json();
        absolutePath = uploadData.absolutePath;
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, inputVideoPath: absolutePath })
      });

      if (!res.ok) throw new Error('Failed to create project');
      const newProj = await res.json();
      
      set(state => ({
        projects: [newProj, ...state.projects],
        activeProject: newProj,
        timeline: {
          id: crypto.randomUUID(),
          projectId: newProj.id,
          tracks: [],
          durationMs: 0
        },
        nodes: defaultNodes,
        isLoading: false
      }));

      return newProj;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  selectProject: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const projRes = await fetch(`/api/projects/${projectId}`);
      if (!projRes.ok) throw new Error('Project not found');
      const project = await projRes.json();

      const timeRes = await fetch(`/api/projects/${projectId}/timeline`);
      const timeline = await timeRes.json();

      set({
        activeProject: project,
        timeline,
        isLoading: false
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  deleteProject: async (projectId) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete failed');
      
      set(state => {
        const nextProjects = state.projects.filter(p => p.id !== projectId);
        const isActive = state.activeProject?.id === projectId;
        return {
          projects: nextProjects,
          activeProject: isActive ? null : state.activeProject,
          timeline: isActive ? null : state.timeline
        };
      });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  saveTimeline: async (timeline) => {
    try {
      const res = await fetch(`/api/projects/${timeline.projectId}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timeline)
      });
      if (!res.ok) throw new Error('Failed to save timeline');
      set({ timeline });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  transcribeProject: async (modelName = 'base') => {
    const { activeProject } = get();
    if (!activeProject) return;

    set(state => ({
      nodes: state.nodes.map(n => n.id === 'subtitle' ? { ...n, data: { ...n.data, status: 'running' } } : n)
    }));

    try {
      const res = await fetch(`/api/projects/${activeProject.id}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName })
      });

      if (!res.ok) throw new Error('Transcription failed');
      const data = await res.json();

      set(state => ({
        activeProject: { ...state.activeProject!, status: 'completed' },
        timeline: data.timeline,
        nodes: state.nodes.map(n => n.id === 'subtitle' ? { ...n, data: { ...n.data, status: 'completed' } } : n)
      }));
    } catch (err: any) {
      set(state => ({
        error: err.message,
        nodes: state.nodes.map(n => n.id === 'subtitle' ? { ...n, data: { ...n.data, status: 'failed', error: err.message } } : n)
      }));
    }
  },

  generateScript: async (prompt, provider, modelName) => {
    const { activeProject } = get();
    if (!activeProject) return;

    set(state => ({
      nodes: state.nodes.map(n => n.id === 'script' ? { ...n, data: { ...n.data, status: 'running' } } : n)
    }));

    try {
      const res = await fetch(`/api/projects/${activeProject.id}/script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider, modelName })
      });

      if (!res.ok) throw new Error('Script generation failed');
      const data = await res.json();

      set(state => ({
        activeProject: { ...state.activeProject!, script: data.script },
        nodes: state.nodes.map(n => n.id === 'script' ? { ...n, data: { ...n.data, status: 'completed' } } : n)
      }));
    } catch (err: any) {
      set(state => ({
        error: err.message,
        nodes: state.nodes.map(n => n.id === 'script' ? { ...n, data: { ...n.data, status: 'failed', error: err.message } } : n)
      }));
    }
  },

  renderVideo: async () => {
    const { activeProject, timeline } = get();
    if (!activeProject || !timeline) return;

    // Save current timeline state first to ensure rendering accurate version
    await get().saveTimeline(timeline);

    set(state => ({
      nodes: state.nodes.map(n => n.id === 'compile' ? { ...n, data: { ...n.data, status: 'running' } } : n)
    }));

    try {
      const res = await fetch(`/api/projects/${activeProject.id}/render`, {
        method: 'POST'
      });

      if (!res.ok) throw new Error('Video rendering failed');
      const data = await res.json();

      set(state => ({
        activeProject: { ...state.activeProject!, status: 'completed', outputVideoPath: data.outputVideoPath },
        nodes: state.nodes.map(n => n.id === 'compile' ? { ...n, data: { ...n.data, status: 'completed' } } : n)
      }));
    } catch (err: any) {
      set(state => ({
        error: err.message,
        nodes: state.nodes.map(n => n.id === 'compile' ? { ...n, data: { ...n.data, status: 'failed', error: err.message } } : n)
      }));
    }
  },

  setNodes: (updater) => {
    set(state => ({
      nodes: typeof updater === 'function' ? updater(state.nodes) : updater
    }));
  },

  setEdges: (updater) => {
    set(state => ({
      edges: typeof updater === 'function' ? updater(state.edges) : updater
    }));
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTimeMs: (ms) => set({ currentTimeMs: ms }),
  setZoom: (zoom) => set({ zoom })
}));
