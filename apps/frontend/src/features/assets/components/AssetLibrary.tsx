import React, { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { Film, Upload, Trash2, Plus, RefreshCw } from 'lucide-react';

export function AssetLibrary() {
  const {
    projects,
    activeProject,
    isLoading,
    createProject,
    selectProject,
    deleteProject
  } = useStore();

  const [newProjectName, setNewProjectName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  return (
    <div className="w-85 border-r border-slate-900 bg-[#090d16]/80 flex flex-col h-full shrink-0">
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
          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-800 focus:outline-none focus:border-blue-500 text-slate-100"
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 cursor-pointer text-slate-300">
            <Upload className="h-4 w-4 text-slate-400" />
            <span className="truncate">
              {selectedFile ? selectedFile.name : 'Upload Video'}
            </span>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shrink-0"
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
              <div className="min-w-0 pr-2">
                <div className="text-sm font-semibold text-slate-200 truncate">{proj.name}</div>
                <div className="text-[10px] text-slate-500 mt-1">{new Date(proj.createdAt).toLocaleDateString()}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteProject(proj.id);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-900 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
