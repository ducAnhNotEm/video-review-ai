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

  past: Timeline[];
  future: Timeline[];

  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (name: string, file: File | null) => Promise<Project>;
  selectProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  saveTimeline: (timeline: Timeline) => Promise<void>;
  updateTimeline: (timeline: Timeline) => void;
  undo: () => void;
  redo: () => void;
  deleteTrack: (trackId: string) => void;
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

let autosaveTimeout: any = null;
const triggerAutosave = (timeline: Timeline, saveTimelineFn: (t: Timeline) => Promise<void>) => {
  if (autosaveTimeout) clearTimeout(autosaveTimeout);
  autosaveTimeout = setTimeout(() => {
    saveTimelineFn(timeline);
  }, 1500);
};

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
  past: [],
  future: [],

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await window.electronAPI.invoke('projects:list');
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
        // In Electron, File objects have a path property
        const filePath = (file as any).path;
        if (!filePath) {
          throw new Error('File path not found. Make sure you are running in Electron desktop environment.');
        }
        const uploadData = await window.electronAPI.invoke('file:upload', filePath);
        absolutePath = uploadData.absolutePath;
      }

      const newProj = await window.electronAPI.invoke('projects:create', { name, inputVideoPath: absolutePath });
      
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
        past: [],
        future: [],
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
      const project = await window.electronAPI.invoke('projects:get', projectId);
      const timeline = await window.electronAPI.invoke('timeline:get', projectId);

      set({
        activeProject: project,
        timeline,
        past: [],
        future: [],
        isLoading: false
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  deleteProject: async (projectId) => {
    try {
      await window.electronAPI.invoke('projects:delete', projectId);
      
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
      await window.electronAPI.invoke('timeline:save', timeline);
      set({ timeline });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateTimeline: (timeline) => {
    const { timeline: currentTimeline, past } = get();
    const clonedPast = currentTimeline ? JSON.parse(JSON.stringify(currentTimeline)) : null;
    const newPast = clonedPast ? [...past, clonedPast] : past;
    
    set({
      timeline,
      past: newPast,
      future: []
    });
    
    triggerAutosave(timeline, get().saveTimeline);
  },

  undo: () => {
    const { past, future, timeline } = get();
    if (past.length === 0) return;
    
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    const currentCloned = timeline ? JSON.parse(JSON.stringify(timeline)) : null;
    const newFuture = currentCloned ? [...future, currentCloned] : future;
    
    set({
      timeline: previous,
      past: newPast,
      future: newFuture
    });
    
    if (previous) {
      triggerAutosave(previous, get().saveTimeline);
    }
  },

  redo: () => {
    const { past, future, timeline } = get();
    if (future.length === 0) return;
    
    const next = future[future.length - 1];
    const newFuture = future.slice(0, future.length - 1);
    
    const currentCloned = timeline ? JSON.parse(JSON.stringify(timeline)) : null;
    const newPast = currentCloned ? [...past, currentCloned] : past;
    
    set({
      timeline: next,
      past: newPast,
      future: newFuture
    });
    
    if (next) {
      triggerAutosave(next, get().saveTimeline);
    }
  },

  deleteTrack: (trackId) => {
    const { timeline } = get();
    if (!timeline) return;
    
    const newTimeline = JSON.parse(JSON.stringify(timeline)) as Timeline;
    newTimeline.tracks = newTimeline.tracks.filter(t => t.id !== trackId);
    
    get().updateTimeline(newTimeline);
  },

  transcribeProject: async (modelName = 'base') => {
    const { activeProject } = get();
    if (!activeProject) return;

    set(state => ({
      nodes: state.nodes.map(n => n.id === 'subtitle' ? { ...n, data: { ...n.data, status: 'running' } } : n)
    }));

    try {
      const data = await window.electronAPI.invoke('ai:transcribe', { projectId: activeProject.id, modelName });

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
      const data = await window.electronAPI.invoke('ai:generateScript', {
        projectId: activeProject.id,
        prompt,
        provider,
        modelName
      });

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
      const data = await window.electronAPI.invoke('video:compile', activeProject.id);

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
