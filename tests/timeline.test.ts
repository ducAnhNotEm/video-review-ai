import { Timeline, Track, Clip } from '../shared/index';

describe('Timeline Engine tests', () => {
  it('should verify timeline structure mapping', () => {
    const videoClip: Clip = {
      id: 'clip-1',
      trackId: 'track-1',
      name: 'Scene 1',
      filePath: 'C:/assets/demo.mp4',
      startOffsetMs: 0,
      durationMs: 5000,
      timelineStartMs: 0
    };

    const videoTrack: Track = {
      id: 'track-1',
      type: 'video',
      name: 'Video Track 1',
      order: 1,
      clips: [videoClip]
    };

    const timeline: Timeline = {
      id: 'timeline-1',
      projectId: 'project-1',
      tracks: [videoTrack],
      durationMs: 5000
    };

    expect(timeline.id).toBe('timeline-1');
    expect(timeline.tracks.length).toBe(1);
    expect(timeline.tracks[0].clips.length).toBe(1);
    expect(timeline.tracks[0].clips[0].durationMs).toBe(5000);
  });
});
