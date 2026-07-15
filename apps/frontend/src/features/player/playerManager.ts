export const playerManager = {
  videoElement: null as HTMLVideoElement | null,
  
  seek(ms: number) {
    if (this.videoElement) {
      this.videoElement.currentTime = ms / 1000;
    }
  },
  
  play() {
    return this.videoElement?.play().catch(console.error);
  },
  
  pause() {
    this.videoElement?.pause();
  }
};
