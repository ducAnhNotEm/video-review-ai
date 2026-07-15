import { useStore } from '../../../store/useStore';
import { MessageSquare, Sparkles, Languages, Cpu } from 'lucide-react';

interface AICommandCenterProps {
  agentPrompt: string;
  setAgentPrompt: (val: string) => void;
  provider: 'gemini' | 'openai' | 'ollama';
  setProvider: (val: 'gemini' | 'openai' | 'ollama') => void;
  whisperModel: string;
  setWhisperModel: (val: string) => void;
}

export function AICommandCenter({
  agentPrompt,
  setAgentPrompt,
  provider,
  setProvider,
  whisperModel,
  setWhisperModel
}: AICommandCenterProps) {
  const {
    activeProject,
    timeline,
    generateScript,
    transcribeProject,
    renderVideo
  } = useStore();

  return (
    <div className="w-80 border-l border-slate-900 bg-[#090d16]/80 flex flex-col h-full shrink-0">
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
      <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Prompt Agent for Script & B-roll</label>
            <textarea
              value={agentPrompt}
              onChange={(e) => setAgentPrompt(e.target.value)}
              placeholder="Describe your video theme or copy script..."
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

        <div className="flex flex-col gap-2 pt-4 border-t border-slate-900/60 mt-4">
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
  );
}
