// Runs on the audio thread: downsamples the mic to 16 kHz mono PCM16 and posts 100 ms frames (what whisper.cpp wants).
class PCM16k extends AudioWorkletProcessor {
  constructor() { super(); this.r = sampleRate / 16000; this.p = 0; this.prev = 0; this.o = new Int16Array(1600); this.n = 0; }
  process(inputs) {
    const x = inputs[0][0];
    if (!x) return true;
    for (let i = 0; i < x.length; i++) {
      this.p += 1;
      if (this.p >= this.r) {
        this.p -= this.r;
        const v = Math.max(-1, Math.min(1, (x[i] + this.prev) / 2));
        this.o[this.n++] = v < 0 ? v * 32768 : v * 32767;
        if (this.n === 1600) { this.port.postMessage(this.o.buffer.slice(0)); this.n = 0; }
      }
      this.prev = x[i];
    }
    return true;
  }
}
registerProcessor("pcm16k", PCM16k);
