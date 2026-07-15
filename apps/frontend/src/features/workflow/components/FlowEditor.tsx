import React from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '../../../store/useStore';
import { ScriptNode, SubtitleNode, CompileNode } from './AgentNodes';
import { Cpu } from 'lucide-react';

const nodeTypes = {
  ScriptNode,
  SubtitleNode,
  CompileNode
};

interface FlowEditorProps {
  agentPrompt: string;
  provider: 'gemini' | 'openai' | 'ollama';
  whisperModel: string;
}

export function FlowEditor({ agentPrompt, provider, whisperModel }: FlowEditorProps) {
  const {
    activeProject,
    timeline,
    nodes,
    edges,
    generateScript,
    transcribeProject,
    renderVideo
  } = useStore();

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

  return (
    <div className="h-[280px] border-b border-slate-900 relative shrink-0">
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
  );
}
