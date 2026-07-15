import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Timeline, Track, Clip } from 'shared';

export class FfmpegService {
  private ffmpegPath: string = 'ffmpeg'; // Default global

  constructor() {
    // If we want to detect a local binary or use the system path, we can set it here.
    // The system has ffmpeg version 8.1.2-essentials_build available globally, so 'ffmpeg' works.
  }

  public compileVideo(timeline: Timeline, outputVideoPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Find tracks
      const videoTrack = timeline.tracks.find(t => t.type === 'video');
      const audioTrack = timeline.tracks.find(t => t.type === 'audio');
      const subtitleTrack = timeline.tracks.find(t => t.type === 'subtitle');

      const videoClips = videoTrack ? videoTrack.clips : [];
      const audioClips = audioTrack ? audioTrack.clips : [];
      const subtitleClips = subtitleTrack ? subtitleTrack.clips : [];

      if (videoClips.length === 0) {
        return reject(new Error('Timeline has no video clips. Cannot compile.'));
      }

      const tempDir = path.join(path.dirname(outputVideoPath), 'temp_render');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Generate SRT subtitle file if subtitle clips are present
      let srtPath = '';
      if (subtitleClips.length > 0) {
        srtPath = path.join(tempDir, `subtitles_${timeline.id}.srt`);
        this.writeSrtFile(subtitleClips, srtPath);
      }

      // We'll write a complex filtergraph or linear concatenation for clips.
      // For simplicity and high reliability on multi-clip compositions, we will:
      // 1. Process each video clip (trim it to its target startOffset & duration, and scale/pad it to 1080p).
      // 2. Concatenate them into a master video stream.
      // 3. Mix in audio tracks.
      // 4. Burn subtitles.
      
      const targetWidth = 1280;
      const targetHeight = 720;
      const targetFps = 30;

      // Prepare input arguments
      const args: string[] = [];
      const filterGraph: string[] = [];

      // Add video clip inputs
      videoClips.forEach((clip, index) => {
        // -ss before -i is faster because it seeks keyframes, but can be slightly inaccurate.
        // We will pass -ss and -t to trim the source clip.
        const inputSeek = clip.startOffsetMs / 1000;
        const durationSec = clip.durationMs / 1000;
        
        args.push('-ss', inputSeek.toString());
        args.push('-t', durationSec.toString());
        args.push('-i', clip.filePath);
      });

      // Add audio inputs
      const audioStartIndex = videoClips.length;
      audioClips.forEach(clip => {
        const inputSeek = clip.startOffsetMs / 1000;
        const durationSec = clip.durationMs / 1000;
        args.push('-ss', inputSeek.toString());
        args.push('-t', durationSec.toString());
        args.push('-i', clip.filePath);
      });

      // Build Filtergraph for Video Scaling & Concatenation
      // Standardize inputs: [i:v] scale=1280:720,fps=30 [v_i]
      videoClips.forEach((_, idx) => {
        filterGraph.push(`[${idx}:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2,fps=${targetFps}[v${idx}]`);
      });

      // Concatenate video clips: [v0][v1]... concat=n=N:v=1:a=0 [out_concated_video]
      const concatInputs = videoClips.map((_, idx) => `[v${idx}]`).join('');
      filterGraph.push(`${concatInputs}concat=n=${videoClips.length}:v=1:a=0[vconcat]`);

      // Handle Audio Mixing
      let finalAudioLabel = '';
      if (audioClips.length > 0) {
        // Map audio streams and delay them based on timelineStartMs if necessary.
        // For basic sequential logic, mix audio tracks using amix:
        const audioMapParts: string[] = [];
        audioClips.forEach((clip, idx) => {
          const streamIdx = audioStartIndex + idx;
          const delayMs = clip.timelineStartMs;
          if (delayMs > 0) {
            filterGraph.push(`[${streamIdx}:a]adelay=${delayMs}|${delayMs}[a${idx}]`);
            audioMapParts.push(`[a${idx}]`);
          } else {
            audioMapParts.push(`[${streamIdx}:a]`);
          }
        });
        filterGraph.push(`${audioMapParts.join('')}amix=inputs=${audioClips.length}:duration=longest[amix]`);
        finalAudioLabel = '[amix]';
      }

      // Final video output label (burn subtitles if SRT is generated)
      let lastVideoLabel = '[vconcat]';
      if (srtPath) {
        // Windows path backslashes need to be doubled or escaped in FFmpeg subtitle filter
        const escapedSrtPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
        filterGraph.push(`[vconcat]subtitles='${escapedSrtPath}'[vsub]`);
        lastVideoLabel = '[vsub]';
      }

      // Add filter complex arguments
      args.push('-filter_complex', filterGraph.join(';'));
      args.push('-map', lastVideoLabel);

      if (audioClips.length > 0) {
        args.push('-map', finalAudioLabel);
      } else {
        // fallback: map first video input's audio if available, or generate silent audio
        // For absolute safety, if there are no audio tracks, generate silent track
        args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
        args.push('-map', `${videoClips.length}:a`);
        args.push('-shortest');
      }

      args.push('-c:v', 'libx264');
      args.push('-preset', 'fast');
      args.push('-crf', '22');
      args.push('-c:a', 'aac');
      args.push('-b:a', '192k');
      args.push('-y'); // Overwrite file
      args.push(outputVideoPath);

      console.log(`Spawning FFmpeg with args: ${args.join(' ')}`);

      const ffmpegProcess = spawn(this.ffmpegPath, args);

      let stdoutLogs = '';
      let stderrLogs = '';

      ffmpegProcess.stdout.on('data', data => {
        stdoutLogs += data.toString();
      });

      ffmpegProcess.stderr.on('data', data => {
        stderrLogs += data.toString();
      });

      ffmpegProcess.on('close', code => {
        // Cleanup temp folder contents
        try {
          if (srtPath && fs.existsSync(srtPath)) {
            fs.unlinkSync(srtPath);
          }
          if (fs.existsSync(tempDir)) {
            fs.rmdirSync(tempDir);
          }
        } catch (cleanupErr) {
          console.error(`Error cleaning up temp render dir: ${cleanupErr}`);
        }

        if (code === 0) {
          console.log(`FFmpeg render succeeded! Output saved to: ${outputVideoPath}`);
          resolve(outputVideoPath);
        } else {
          console.error(`FFmpeg failed with code: ${code}`);
          console.error(`Stderr outputs:\n${stderrLogs}`);
          reject(new Error(`FFmpeg exited with code ${code}. Error logs: ${stderrLogs}`));
        }
      });
    });
  }

  private writeSrtFile(clips: Clip[], outputPath: string): void {
    let srtContent = '';
    clips.forEach((clip, index) => {
      const startMs = clip.timelineStartMs;
      const endMs = clip.timelineStartMs + clip.durationMs;
      const text = clip.textConfig?.content || clip.name;

      const formatTime = (ms: number): string => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        const mil = ms % 1000;

        const pad = (n: number, size: number) => ('000' + n).slice(-size);
        return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(mil, 3)}`;
      };

      srtContent += `${index + 1}\n`;
      srtContent += `${formatTime(startMs)} --> ${formatTime(endMs)}\n`;
      srtContent += `${text}\n\n`;
    });

    fs.writeFileSync(outputPath, srtContent, 'utf-8');
  }

  public probeVideoDuration(filePath: string): Promise<number> {
    return new Promise((resolve) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filePath
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          const durationSec = parseFloat(output.trim());
          if (!isNaN(durationSec)) {
            return resolve(Math.round(durationSec * 1000));
          }
        }
        resolve(10000);
      });

      ffprobe.on('error', () => {
        resolve(10000);
      });
    });
  }
}

export const ffmpegService = new FfmpegService();
