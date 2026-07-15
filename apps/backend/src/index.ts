import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Project, Timeline, Track, Clip, ProjectAsset } from 'shared';
import { initDb, projectRepository, timelineRepository, assetRepository } from './db';
import { whisperService } from './services/whisperService';
import { llmService } from './services/llmService';
import { ffmpegService } from './services/ffmpegService';
import dotenv from 'dotenv';

// Load environmental keys
dotenv.config();

// Ensure DB is initialized
initDb();

const UPLOADS_DIR = path.resolve(process.cwd(), '../../data/uploads');
const RENDERS_DIR = path.resolve(process.cwd(), '../../data/renders');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(RENDERS_DIR)) fs.mkdirSync(RENDERS_DIR, { recursive: true });

export function initIpc(ipcMain: any) {
  ipcMain.handle('projects:list', async () => {
    return projectRepository.list();
  });

  ipcMain.handle('assets:list', async (event: any, projectId: string) => {
    return assetRepository.listForProject(projectId);
  });

  ipcMain.handle('assets:add', async (event: any, { projectId, filePath }: { projectId: string; filePath: string }) => {
    if (!fs.existsSync(filePath)) throw new Error('File not found');
    const ext = path.extname(filePath).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    const targetPath = path.join(UPLOADS_DIR, uniqueName);
    fs.copyFileSync(filePath, targetPath);

    const absolutePath = targetPath.replace(/\\/g, '/');

    let fileType: 'video' | 'audio' | 'image' = 'image';
    if (['.mp4', '.mkv', '.avi', '.mov'].includes(ext)) {
      fileType = 'video';
    } else if (['.mp3', '.wav', '.m4a', '.aac'].includes(ext)) {
      fileType = 'audio';
    }

    let durationMs: number | undefined;
    if (fileType === 'video' || fileType === 'audio') {
      durationMs = await ffmpegService.probeVideoDuration(absolutePath);
    }

    const newAsset: ProjectAsset = {
      id: uuidv4(),
      projectId,
      name: path.basename(filePath),
      filePath: absolutePath,
      fileType,
      durationMs,
      createdAt: new Date().toISOString()
    };

    assetRepository.create(newAsset);
    return newAsset;
  });

  ipcMain.handle('assets:delete', async (event: any, id: string) => {
    assetRepository.delete(id);
    return { success: true };
  });

  ipcMain.handle('projects:create', async (event: any, { name, inputVideoPath }: { name: string; inputVideoPath?: string }) => {
    const newProject: Project = {
      id: uuidv4(),
      name: name || 'Untitled Project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      inputVideoPath,
      status: 'idle'
    };
    projectRepository.create(newProject);
    return newProject;
  });

  ipcMain.handle('projects:get', async (event: any, id: string) => {
    const proj = projectRepository.get(id);
    if (!proj) throw new Error('Project not found');
    return proj;
  });

  ipcMain.handle('projects:delete', async (event: any, id: string) => {
    projectRepository.delete(id);
    return { success: true };
  });

  ipcMain.handle('file:upload', async (event: any, sourcePath: string) => {
    if (!fs.existsSync(sourcePath)) throw new Error('Source file not found');
    const ext = path.extname(sourcePath);
    const uniqueName = `${uuidv4()}${ext}`;
    const targetPath = path.join(UPLOADS_DIR, uniqueName);
    fs.copyFileSync(sourcePath, targetPath);
    // Return relative and absolute paths
    const relativePath = `data/uploads/${uniqueName}`;
    const absolutePath = targetPath.replace(/\\/g, '/');
    return { relativePath, absolutePath };
  });

  ipcMain.handle('timeline:get', async (event: any, projectId: string) => {
    const timeline = timelineRepository.getForProject(projectId);
    if (!timeline) {
      return {
        id: uuidv4(),
        projectId,
        tracks: [],
        durationMs: 0
      };
    }
    return timeline;
  });

  ipcMain.handle('timeline:save', async (event: any, timeline: Timeline) => {
    timelineRepository.save(timeline);
    return { success: true };
  });

  ipcMain.handle('ai:transcribe', async (event: any, { projectId, modelName }: { projectId: string; modelName?: string }) => {
    const project = projectRepository.get(projectId);
    if (!project) throw new Error('Project not found');
    if (!project.inputVideoPath) throw new Error('Project has no input video');

    projectRepository.update(projectId, { status: 'transcribing' });
    
    try {
      const result = await whisperService.transcribe(project.inputVideoPath, modelName || 'base', 'vi');

      const timelineId = uuidv4();
      const videoTrackId = uuidv4();
      const subtitleTrackId = uuidv4();

      const maxDuration = result.subtitles.length > 0 ? result.subtitles[result.subtitles.length - 1].endMs : 10000;

      const videoClip: Clip = {
        id: uuidv4(),
        trackId: videoTrackId,
        name: 'Main Video Source',
        filePath: project.inputVideoPath,
        startOffsetMs: 0,
        durationMs: maxDuration,
        timelineStartMs: 0
      };

      const subtitleClips: Clip[] = result.subtitles.map((sub, i) => ({
        id: uuidv4(),
        trackId: subtitleTrackId,
        name: `Sub_${i}`,
        filePath: '',
        startOffsetMs: 0,
        durationMs: sub.endMs - sub.startMs,
        timelineStartMs: sub.startMs,
        textConfig: {
          content: sub.text,
          fontSize: 24,
          fontColor: '#ffffff',
          fontFamily: 'Arial',
          align: 'center',
          bold: true,
          italic: false
        }
      }));

      const videoTrack: Track = {
        id: videoTrackId,
        type: 'video',
        name: 'Video Track 1',
        order: 1,
        clips: [videoClip]
      };

      const subtitleTrack: Track = {
        id: subtitleTrackId,
        type: 'subtitle',
        name: 'Subtitles Track',
        order: 2,
        clips: subtitleClips
      };

      const timeline: Timeline = {
        id: timelineId,
        projectId,
        tracks: [videoTrack, subtitleTrack],
        durationMs: maxDuration
      };

      timelineRepository.save(timeline);
      projectRepository.update(projectId, { status: 'completed' });

      return { subtitles: result.subtitles, text: result.text, timeline };
    } catch (err: any) {
      projectRepository.update(projectId, { status: 'failed', errorMessage: err.message });
      throw err;
    }
  });

  ipcMain.handle('ai:generateScript', async (event: any, { projectId, prompt, provider, modelName }: any) => {
    const project = projectRepository.get(projectId);
    if (!project) throw new Error('Project not found');

    projectRepository.update(projectId, { status: 'generating_script' });

    try {
      const result = await llmService.generateScript({
        prompt,
        provider: provider || 'gemini',
        modelName: modelName || ''
      });

      projectRepository.update(projectId, {
        script: result.script,
        status: 'idle'
      });

      return result;
    } catch (err: any) {
      projectRepository.update(projectId, { status: 'failed', errorMessage: err.message });
      throw err;
    }
  });

  ipcMain.handle('video:compile', async (event: any, projectId: string) => {
    const project = projectRepository.get(projectId);
    if (!project) throw new Error('Project not found');

    const timeline = timelineRepository.getForProject(projectId);
    if (!timeline) throw new Error('Timeline not found');

    projectRepository.update(projectId, { status: 'rendering' });

    try {
      const outputFileName = `render_${projectId}_${Date.now()}.mp4`;
      const outputPath = path.join(RENDERS_DIR, outputFileName).replace(/\\/g, '/');

      await ffmpegService.compileVideo(timeline, outputPath);

      const absoluteOutputPath = outputPath;
      projectRepository.update(projectId, {
        status: 'completed',
        outputVideoPath: absoluteOutputPath
      });

      return { outputVideoPath: absoluteOutputPath };
    } catch (err: any) {
      projectRepository.update(projectId, { status: 'failed', errorMessage: err.message });
      throw err;
    }
  });
}
