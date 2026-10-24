const PLAY_RATE = 24000; // Kokoro output rate

// One shared AudioContext: mic capture -> PCM16 chunks, streamed playback of server audio, and analysers for the orb.
class AudioEngine {
  ctx = null; outAn = null; micAn = null; stream = null; src = null; node = null; mute = null;
  next = 0; sources = new Set(); loaded = false; f = new Uint8Array(128);

  async ensure() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.outAn = this.ctx.createAnalyser(); this.outAn.fftSize = 256;
      this.outAn.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  async startMic(onPcm) {
    await this.ensure();
    this.stopMic();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
    if (!this.loaded) { await this.ctx.audioWorklet.addModule("/pcm-worklet.js"); this.loaded = true; }
    this.src = this.ctx.createMediaStreamSource(this.stream);
    this.micAn = this.ctx.createAnalyser(); this.micAn.fftSize = 256;
    this.node = new AudioWorkletNode(this.ctx, "pcm16k");
    this.node.port.onmessage = (e) => onPcm(e.data);
    this.mute = this.ctx.createGain(); this.mute.gain.value = 0; // keeps the graph alive without echoing the mic
    this.src.connect(this.micAn); this.src.connect(this.node); this.node.connect(this.mute); this.mute.connect(this.ctx.destination);
  }

  stopMic() {
    this.stream?.getTracks().forEach((t) => t.stop());
    [this.src, this.node, this.mute].forEach((n) => n?.disconnect());
    this.stream = this.src = this.node = this.mute = this.micAn = null;
  }

  // Server sends raw PCM16LE mono @ 24 kHz frames; chunks are queued back-to-back for gapless playback.
  playChunk(buf) {
    const ctx = this.ctx;
    if (!ctx || buf.byteLength < 2) return;
    const i16 = new Int16Array(buf, 0, buf.byteLength >> 1);
    const ab = ctx.createBuffer(1, i16.length, PLAY_RATE);
    const ch = ab.getChannelData(0);
    for (let i = 0; i < i16.length; i++) ch[i] = i16[i] / 32768;
    const s = ctx.createBufferSource();
    s.buffer = ab; s.connect(this.outAn);
    const t = Math.max(ctx.currentTime + 0.05, this.next);
    s.start(t); this.next = t + ab.duration;
    this.sources.add(s); s.onended = () => this.sources.delete(s);
  }

  stopPlayback() {
    this.sources.forEach((s) => { try { s.stop(); } catch { /* already ended */ } });
    this.sources.clear(); this.next = 0;
  }

  isPlaying() { return !!this.ctx && this.next > this.ctx.currentTime; }

  // bass = low band, high = upper band, level = overall volume (all 0..1)
  bands(kind) {
    const an = kind === "mic" ? this.micAn : this.outAn;
    if (!an) return null;
    an.getByteFrequencyData(this.f);
    const avg = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += this.f[i]; return s / ((b - a) * 255); };
    return { level: Math.min(1, avg(1, 40) * 2.5), bass: Math.min(1, avg(0, 3) * 2.5), high: Math.min(1, avg(12, 64) * 4) };
  }
}
export const engine = new AudioEngine();
