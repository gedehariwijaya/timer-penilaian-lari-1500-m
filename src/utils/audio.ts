// Audio notification & SpeechSynthesis utility for 1.5km running timer

class AudioManager {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play synthetic pleasant beep/chime
  playTone(freq: number, durationMs: number, type: OscillatorType = "sine", volume = 0.3): void {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch (e) {
      console.warn("Web Audio API not supported or blocked:", e);
    }
  }

  // Play checkpoint two-tone chime
  playCheckpointChime(): void {
    this.playTone(587.33, 180, "sine", 0.4); // D5
    setTimeout(() => {
      this.playTone(880, 300, "sine", 0.4); // A5
    }, 180);
  }

  // Play countdown beep
  playCountdownBeep(isFinal = false): void {
    if (isFinal) {
      this.playTone(1046.5, 450, "sine", 0.5); // High C6 (Go!)
    } else {
      this.playTone(523.25, 180, "sine", 0.35); // C5
    }
  }

  // Play finish victory fanfare
  playFinishFanfare(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C - E - G - C
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 250, "triangle", 0.4);
      }, idx * 140);
    });
  }

  // Speak notification via Indonesian SpeechSynthesis
  speak(text: string, rate = 1.0, pitch = 1.0): void {
    if (!("speechSynthesis" in window)) {
      console.warn("SpeechSynthesis not supported on this browser.");
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = rate;
      utterance.pitch = pitch;

      // Try to find Indonesian voice
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find((v) => v.lang.startsWith("id") || v.lang.includes("ID"));
      if (idVoice) {
        utterance.voice = idVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
    }
  }

  // Comprehensive 500m interval voice announcement
  announceCheckpoint(distanceM: number, elapsedMs: number, speedKmh: number, isFinish = false): void {
    this.playCheckpointChime();

    const totalSeconds = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const timePhrase = mins > 0 ? `${mins} menit ${secs} detik` : `${secs} detik`;
    const speedPhrase = speedKmh.toFixed(1).replace(".", " koma ");

    let message = "";
    if (isFinish || distanceM >= 1500) {
      message = `Selamat! Jarak seribu lima ratus meter selesai! Total waktu tempuh ${timePhrase}. Kecepatan rata-rata ${speedPhrase} kilometer per jam. Ujian lari selesai!`;
    } else if (distanceM === 500) {
      message = `Perhatian, jarak 500 meter tercapai! Waktu tempuh ${timePhrase}. Kecepatan ${speedPhrase} kilometer per jam. Pertahankan ritme lari!`;
    } else if (distanceM === 1000) {
      message = `Bagus! Jarak 1 kilometer tercapai! Waktu ${timePhrase}. Kecepatan ${speedPhrase} kilometer per jam. Sisa 500 meter terakhir, ayo maksimalkan!`;
    } else {
      message = `Jarak ${distanceM} meter tercapai. Waktu tempuh ${timePhrase}. Kecepatan ${speedPhrase} kilometer per jam.`;
    }

    // Speak after chime starts
    setTimeout(() => {
      this.speak(message);
    }, 400);
  }
}

export const audioService = new AudioManager();
