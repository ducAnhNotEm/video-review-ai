import express from 'express';
import cors from 'cors';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Project, Timeline, Track, Clip } from 'shared';
import { initDb, projectRepository, timelineRepository } from './db';
import { whisperService } from './services/whisperService';
import { llmService } from './services/llmService';
import { ffmpegService } from './services/ffmpegService';
import dotenv from 'dotenv';

// Load environmental keys
dotenv.config();

// Ensure DB is initialized
initDb();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Assets and uploads configurations
const UPLOADS_DIR = path.resolve(process.cwd(), '../../data/uploads');
const RENDERS_DIR = path.resolve(process.cwd(), '../../data/renders');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(RENDERS_DIR)) fs.mkdirSync(RENDERS_DIR, { recursive: true });

// Static assets exposure so the frontend can display previews of uploaded files
app.use('/data/uploads', express.static(UPLOADS_DIR));
app.use('/data/renders', express.static(RENDERS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Projects routes
app.get('/api/projects', (req, res) => {
  try {
    const list = projectRepository.list();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', (req, res) => {
  try {
    const { name, inputVideoPath } = req.body;
    const newProject: Project = {
      id: uuidv4(),
      name: name || 'Untitled Project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      inputVideoPath,
      status: 'idle'
    };

    projectRepository.create(newProject);
    res.status(201).json(newProject);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id', (req, res) => {
  try {
    const proj = projectRepository.get(req.params.id);
    if (!proj) return res.status(404).json({ error: 'Project not found' });
    res.json(proj);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  try {
    projectRepository.delete(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// File upload endpoint
app.post('/api/upload', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }
    const relativePath = path.join('data/uploads', req.file.filename).replace(/\\/g, '/');
    const absolutePath = req.file.path.replace(/\\/g, '/');
    res.json({ relativePath, absolutePath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Timeline endpoints
app.get('/api/projects/:id/timeline', (req, res) => {
  try {
    const timeline = timelineRepository.getForProject(req.params.id);
    if (!timeline) {
      // Return empty default timeline
      return res.json({
        id: uuidv4(),
        projectId: req.params.id,
        tracks: [],
        durationMs: 0
      });
    }
    res.json(timeline);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:id/timeline', (req, res) => {
  try {
    const timeline: Timeline = req.body;
    timelineRepository.save(timeline);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Transcribe route
app.post('/api/projects/:id/transcribe', async (req, res) => {
  const projectId = req.params.id;
  try {
    const project = projectRepository.get(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.inputVideoPath) return res.status(400).json({ error: 'Project has no input video' });

    projectRepository.update(projectId, { status: 'transcribing' });

    const modelName = req.body.model || 'base';
    const result = await whisperService.transcribe(project.inputVideoPath, modelName, 'vi');

    // Create a default timeline with video track and subtitle track
    const timelineId = uuidv4();
    const videoTrackId = uuidv4();
    const subtitleTrackId = uuidv4();

    // Determine target video file duration (approximate or dynamic, for MVP we can use timeline subtitles size)
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

    res.json({ subtitles: result.subtitles, text: result.text, timeline });
  } catch (err: any) {
    projectRepository.update(projectId, { status: 'failed', errorMessage: err.message });
    res.status(500).json({ error: err.message });
  }
});

// AI Script Agent route
app.post('/api/projects/:id/script', async (req, res) => {
  const projectId = req.params.id;
  try {
    const { prompt, provider, modelName } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    projectRepository.update(projectId, { status: 'generating_script' });

    const result = await llmService.generateScript({
      prompt,
      provider: provider || 'gemini',
      modelName: modelName || ''
    });

    projectRepository.update(projectId, {
      script: result.script,
      status: 'idle'
    });

    res.json(result);
  } catch (err: any) {
    projectRepository.update(projectId, { status: 'failed', errorMessage: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Render Timeline route
app.post('/api/projects/:id/render', async (req, res) => {
  const projectId = req.params.id;
  try {
    const timeline = timelineRepository.getForProject(projectId);
    if (!timeline) return res.status(400).json({ error: 'Timeline not found' });

    projectRepository.update(projectId, { status: 'rendering' });

    const outputFileName = `render_${projectId}_${Date.now()}.mp4`;
    const outputPath = path.join(RENDERS_DIR, outputFileName).replace(/\\/g, '/');

    await ffmpegService.compileVideo(timeline, outputPath);

    const relativeOutputPath = `data/renders/${outputFileName}`;
    projectRepository.update(projectId, {
      status: 'completed',
      outputVideoPath: relativeOutputPath
    });

    res.json({ outputVideoPath: relativeOutputPath });
  } catch (err: any) {
    projectRepository.update(projectId, { status: 'failed', errorMessage: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Express AI backend listening on port ${PORT}`);
});
