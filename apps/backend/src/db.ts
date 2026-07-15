import { DatabaseSync } from 'node:sqlite';
import { Project, Timeline, Track, Clip, ProjectAsset } from 'shared';
import * as path from 'path';
import * as fs from 'fs';

const DB_DIR = path.resolve(process.cwd(), '../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
const DB_PATH = path.join(DB_DIR, 'video-agent.db');

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');

// Initialize database tables
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      inputVideoPath TEXT,
      outputVideoPath TEXT,
      script TEXT,
      status TEXT NOT NULL,
      errorMessage TEXT
    );

    CREATE TABLE IF NOT EXISTS timelines (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      durationMs INTEGER NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      timelineId TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      FOREIGN KEY (timelineId) REFERENCES timelines(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS clips (
      id TEXT PRIMARY KEY,
      trackId TEXT NOT NULL,
      name TEXT NOT NULL,
      filePath TEXT NOT NULL,
      startOffsetMs INTEGER NOT NULL,
      durationMs INTEGER NOT NULL,
      timelineStartMs INTEGER NOT NULL,
      transformJson TEXT,
      textConfigJson TEXT,
      FOREIGN KEY (trackId) REFERENCES tracks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      name TEXT NOT NULL,
      filePath TEXT NOT NULL,
      fileType TEXT NOT NULL,
      durationMs INTEGER,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);
}

// Project CRUD repository
export const projectRepository = {
  create(project: Project): void {
    const stmt = db.prepare(`
      INSERT INTO projects (id, name, createdAt, updatedAt, inputVideoPath, outputVideoPath, script, status, errorMessage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      project.id,
      project.name,
      project.createdAt,
      project.updatedAt,
      project.inputVideoPath || null,
      project.outputVideoPath || null,
      project.script || null,
      project.status,
      project.errorMessage || null
    );
  },

  get(id: string): Project | null {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      inputVideoPath: row.inputVideoPath || undefined,
      outputVideoPath: row.outputVideoPath || undefined,
      script: row.script || undefined,
      status: row.status,
      errorMessage: row.errorMessage || undefined,
    };
  },

  list(): Project[] {
    const rows = db.prepare('SELECT * FROM projects ORDER BY createdAt DESC').all() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      inputVideoPath: row.inputVideoPath || undefined,
      outputVideoPath: row.outputVideoPath || undefined,
      script: row.script || undefined,
      status: row.status,
      errorMessage: row.errorMessage || undefined,
    }));
  },

  update(id: string, updates: Partial<Omit<Project, 'id'>>): void {
    const fields = Object.keys(updates);
    if (fields.length === 0) return;

    const sets = fields.map(field => `"${field}" = ?`).join(', ');
    const values = fields.map(field => (updates as any)[field] ?? null);

    const stmt = db.prepare(`UPDATE projects SET ${sets}, updatedAt = ? WHERE id = ?`);
    stmt.run(...values, new Date().toISOString(), id);
  },

  delete(id: string): void {
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  }
};

// Timeline Repository
export const timelineRepository = {
  save(timeline: Timeline): void {
    try {
      db.exec('BEGIN TRANSACTION');

      // Clean existing timeline, tracks and clips
      db.prepare('DELETE FROM timelines WHERE projectId = ?').run(timeline.projectId);

      db.prepare(`
        INSERT INTO timelines (id, projectId, durationMs) VALUES (?, ?, ?)
      `).run(timeline.id, timeline.projectId, timeline.durationMs);

      for (const track of timeline.tracks) {
        db.prepare(`
          INSERT INTO tracks (id, timelineId, type, name, "order") VALUES (?, ?, ?, ?, ?)
        `).run(track.id, timeline.id, track.type, track.name, track.order);

        for (const clip of track.clips) {
          db.prepare(`
            INSERT INTO clips (id, trackId, name, filePath, startOffsetMs, durationMs, timelineStartMs, transformJson, textConfigJson)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            clip.id,
            clip.trackId,
            clip.name,
            clip.filePath,
            clip.startOffsetMs,
            clip.durationMs,
            clip.timelineStartMs,
            clip.transform ? JSON.stringify(clip.transform) : null,
            clip.textConfig ? JSON.stringify(clip.textConfig) : null
          );
        }
      }

      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  },

  getForProject(projectId: string): Timeline | null {
    const timelineRow = db.prepare('SELECT * FROM timelines WHERE projectId = ?').get(projectId) as any;
    if (!timelineRow) return null;

    const trackRows = db.prepare('SELECT * FROM tracks WHERE timelineId = ? ORDER BY "order" ASC').all(timelineRow.id) as any[];

    const tracks: Track[] = [];
    for (const trackRow of trackRows) {
      const clipRows = db.prepare('SELECT * FROM clips WHERE trackId = ? ORDER BY timelineStartMs ASC').all(trackRow.id) as any[];
      const clips: Clip[] = clipRows.map(c => ({
        id: c.id,
        trackId: c.trackId,
        name: c.name,
        filePath: c.filePath,
        startOffsetMs: c.startOffsetMs,
        durationMs: c.durationMs,
        timelineStartMs: c.timelineStartMs,
        transform: c.transformJson ? JSON.parse(c.transformJson) : undefined,
        textConfig: c.textConfigJson ? JSON.parse(c.textConfigJson) : undefined,
      }));

      tracks.push({
        id: trackRow.id,
        type: trackRow.type,
        name: trackRow.name,
        order: trackRow.order,
        clips,
      });
    }

    return {
      id: timelineRow.id,
      projectId: timelineRow.projectId,
      tracks,
      durationMs: timelineRow.durationMs,
    };
  }
};

// Asset CRUD Repository
export const assetRepository = {
  create(asset: ProjectAsset): void {
    const stmt = db.prepare(`
      INSERT INTO assets (id, projectId, name, filePath, fileType, durationMs, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      asset.id,
      asset.projectId,
      asset.name,
      asset.filePath,
      asset.fileType,
      asset.durationMs ?? null,
      asset.createdAt
    );
  },

  listForProject(projectId: string): ProjectAsset[] {
    const rows = db.prepare('SELECT * FROM assets WHERE projectId = ? ORDER BY createdAt DESC').all(projectId) as any[];
    return rows.map(row => ({
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      filePath: row.filePath,
      fileType: row.fileType,
      durationMs: row.durationMs !== null ? row.durationMs : undefined,
      createdAt: row.createdAt
    }));
  },

  delete(id: string): void {
    db.prepare('DELETE FROM assets WHERE id = ?').run(id);
  }
};
