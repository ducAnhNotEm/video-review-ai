import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { TranscribeResponse, Subtitle } from 'shared';

export class WhisperService {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    // Resolve the workspace relative .venv python and whisper_transcribe script
    const projectRoot = path.resolve(__dirname, '../../../../');
    this.pythonPath = path.join(projectRoot, '.venv', 'Scripts', 'python.exe');
    this.scriptPath = path.join(projectRoot, 'whisper_transcribe.py');

    // Fallback just in case they aren't Windows or have dynamic layouts
    if (!fs.existsSync(this.pythonPath)) {
      this.pythonPath = 'python'; // Fallback to global python
    }
  }

  public transcribe(videoPath: string, modelName: string = 'base', language: string = 'vi'): Promise<TranscribeResponse> {
    return new Promise((resolve, reject) => {
      const outputDir = path.dirname(videoPath);
      const outputFileName = `${path.basename(videoPath, path.extname(videoPath))}_transcript.json`;
      const outputPath = path.join(outputDir, outputFileName);

      const args = [
        this.scriptPath,
        '--input', videoPath,
        '--output', outputPath,
        '--model', modelName,
        '--language', language
      ];

      console.log(`Running Whisper command: ${this.pythonPath} ${args.join(' ')}`);

      execFile(this.pythonPath, args, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Whisper Exec Error: ${error.message}`);
          console.error(`Stderr: ${stderr}`);
          return reject(new Error(error.message));
        }

        console.log(`Whisper Stdout: ${stdout}`);

        try {
          if (!fs.existsSync(outputPath)) {
            return reject(new Error(`Whisper execution succeeded but output file was not found at ${outputPath}`));
          }

          const fileContent = fs.readFileSync(outputPath, 'utf-8');
          const data = JSON.parse(fileContent);

          // Clean up the temporary JSON file
          fs.unlinkSync(outputPath);

          resolve(data as TranscribeResponse);
        } catch (parseError) {
          reject(new Error(`Failed to parse Whisper JSON output: ${parseError}`));
        }
      });
    });
  }
}

export const whisperService = new WhisperService();
