import React, { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { Film, Upload, Trash2, Plus, RefreshCw, Music, Image as ImageIcon, Video, FolderOpen, Database } from 'lucide-react';

export function AssetLibrary() {
  const {
    projects,
    activeProject,
    assets,
    isLoading,
    createProject,
    selectProject,
    deleteProject,
    importAsset,
    deleteAsset
  } = useStore();

  const [activeTab, setActiveTab] = useState<'projects' | 'media'>('projects');
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

  const handleImportAsset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProject) return;
    try {
      // In Electron context, file.path is available
      const filePath = (file as any).path;
      if (filePath) {
        await importAsset(filePath);
      }
    } catch (err) {
      console.error('Failed to import asset:', err);
    }
  };

  const getAssetIcon = (type: 'video' | 'audio' | 'image') => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4 text-blue-400" />;
      case 'audio':
        return <Music className="h-4 w-4 text-emerald-400" />;
      case 'image':
        return <ImageIcon className="h-4 w-4 text-amber-400" />;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const secs = Math.floor(ms / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-80 border-r border-slate-900 bg-[#090d16]/80 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-slate-900 flex items-center gap-2">
        <Film className="h-6 w-6 text-blue-500 animate-pulse" />
        <h1 className="text-lg font-bold tracking-wider bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          AI Video Agent
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-900 text-xs font-bold text-slate-400">
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'projects'
              ? 'border-blue-500 text-slate-100 bg-slate-950/20'
              : 'border-transparent hover:text-slate-200 hover:bg-slate-950/10'
          }`}
        >
          <FolderOpen className="h-3.5 w-3.5" /> Projects
        </button>
        <button
          onClick={() => setActiveTab('media')}
          disabled={!activeProject}
          className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            activeTab === 'media'
              ? 'border-blue-500 text-slate-100 bg-slate-950/20'
              : 'border-transparent hover:text-slate-200 hover:bg-slate-950/10'
          }`}
          title={!activeProject ? 'Select a project first to open Media Pool' : 'Media Pool'}
        >
          <Database className="h-3.5 w-3.5" /> Media Pool
        </button>
      </div>

      {/* Tab Panel: Projects */}
      {activeTab === 'projects' && (
        <>
          {/* Create Project Form */}
          <form onSubmit={handleCreateProject} className="p-4 border-b border-slate-900 flex flex-col gap-3">
            <input
              type="text"
              placeholder="Project Name..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-800 focus:outline-none focus:border-blue-500 text-slate-100 placeholder-slate-500"
            />
            <div className="flex items-center justify-between gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 cursor-pointer text-slate-300">
                <Upload className="h-4 w-4 text-slate-400" />
                <span className="truncate max-w-[100px]">
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

          {/* Project List */}
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
        </>
      )}

      {/* Tab Panel: Media Pool */}
      {activeTab === 'media' && activeProject && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Import Asset Toolbar */}
          <div className="p-4 border-b border-slate-900">
            <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 cursor-pointer text-white shadow-lg shadow-blue-600/15">
              <Plus className="h-4 w-4" /> Import Media File
              <input
                type="file"
                accept="video/*,audio/*,image/*"
                onChange={handleImportAsset}
                className="hidden"
              />
            </label>
          </div>

          {/* Asset List */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Media Assets</h3>
            {assets.length === 0 ? (
              <div className="text-xs text-slate-500 py-8 text-center select-none">
                No assets in this project. Click Import above to add video, audio, or images.
              </div>
            ) : (
              assets.map((asset) => (
                <div
                  key={asset.id}
                  className="p-3 rounded-xl bg-slate-950/40 border border-slate-900 hover:border-slate-800 flex justify-between items-center group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="p-2 bg-slate-900 rounded-lg shrink-0">
                      {getAssetIcon(asset.fileType)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-200 truncate" title={asset.name}>
                        {asset.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                        <span className="capitalize">{asset.fileType}</span>
                        {asset.durationMs && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(asset.durationMs)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAsset(asset.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-900 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
