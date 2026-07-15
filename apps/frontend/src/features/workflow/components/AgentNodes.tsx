import React from 'react';
import { Handle, Position } from 'reactflow';
import { CheckCircle2, AlertCircle, Loader2, Sparkles, FileText, Cpu } from 'lucide-react';

interface NodeData {
  label: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  error?: string;
  config?: Record<string, any>;
}

export const ScriptNode: React.FC<{ data: NodeData }> = ({ data }) => {
  return (
    <div className={`p-4 rounded-xl glass-panel w-52 glow-border transition-all duration-300 ${
      data.status === 'running' ? 'border-blue-500 shadow-blue-500/10 shadow-lg' :
      data.status === 'completed' ? 'border-emerald-500 shadow-emerald-500/10 shadow-lg' :
      data.status === 'failed' ? 'border-rose-500 shadow-rose-500/10 shadow-lg' : 'border-slate-800'
    }`}>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${
          data.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
        }`}>
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-200 truncate">{data.label}</h4>
          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            {data.status === 'running' && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                Generating...
              </>
            )}
            {data.status === 'completed' && (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Script Ready
              </>
            )}
            {data.status === 'failed' && (
              <>
                <AlertCircle className="h-3 w-3 text-rose-400" />
                Failed
              </>
            )}
            {data.status === 'idle' && 'Ready to prompt'}
          </span>
        </div>
      </div>
      {data.error && (
        <div className="text-[10px] text-rose-400 mt-2 bg-rose-500/5 p-1.5 rounded border border-rose-500/10 max-h-16 overflow-y-auto">
          {data.error}
        </div>
      )}
    </div>
  );
};

export const SubtitleNode: React.FC<{ data: NodeData }> = ({ data }) => {
  return (
    <div className={`p-4 rounded-xl glass-panel w-52 glow-border transition-all duration-300 ${
      data.status === 'running' ? 'border-blue-500 shadow-blue-500/10 shadow-lg' :
      data.status === 'completed' ? 'border-emerald-500 shadow-emerald-500/10 shadow-lg' :
      data.status === 'failed' ? 'border-rose-500 shadow-rose-500/10 shadow-lg' : 'border-slate-800'
    }`}>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${
          data.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'
        }`}>
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-200 truncate">{data.label}</h4>
          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            {data.status === 'running' && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                Transcribing...
              </>
            )}
            {data.status === 'completed' && (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Text Loaded
              </>
            )}
            {data.status === 'failed' && (
              <>
                <AlertCircle className="h-3 w-3 text-rose-400" />
                Failed
              </>
            )}
            {data.status === 'idle' && 'No input video'}
          </span>
        </div>
      </div>
      {data.error && (
        <div className="text-[10px] text-rose-400 mt-2 bg-rose-500/5 p-1.5 rounded border border-rose-500/10 max-h-16 overflow-y-auto">
          {data.error}
        </div>
      )}
    </div>
  );
};

export const CompileNode: React.FC<{ data: NodeData }> = ({ data }) => {
  return (
    <div className={`p-4 rounded-xl glass-panel w-52 glow-border transition-all duration-300 ${
      data.status === 'running' ? 'border-violet-500 shadow-violet-500/10 shadow-lg' :
      data.status === 'completed' ? 'border-emerald-500 shadow-emerald-500/10 shadow-lg' :
      data.status === 'failed' ? 'border-rose-500 shadow-rose-500/10 shadow-lg' : 'border-slate-800'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-violet-500" />
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${
          data.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-violet-500/10 text-violet-400'
        }`}>
          <Cpu className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-200 truncate">{data.label}</h4>
          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            {data.status === 'running' && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
                Rendering...
              </>
            )}
            {data.status === 'completed' && (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Finished MP4
              </>
            )}
            {data.status === 'failed' && (
              <>
                <AlertCircle className="h-3 w-3 text-rose-400" />
                Failed
              </>
            )}
            {data.status === 'idle' && 'Waiting for pipeline'}
          </span>
        </div>
      </div>
      {data.error && (
        <div className="text-[10px] text-rose-400 mt-2 bg-rose-500/5 p-1.5 rounded border border-rose-500/10 max-h-16 overflow-y-auto">
          {data.error}
        </div>
      )}
    </div>
  );
};
