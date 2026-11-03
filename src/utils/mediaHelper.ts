/**
 * Memutar file audio `/alarm.wav` dengan penguat suara (Web Audio API Gain Booster)
 * dan mode looping agar terus berbunyi sampai dihentikan secara eksplisit.
 */

let activeAudioElement: HTMLAudioElement | null = null;
let activeAudioCtx: AudioContext | null = null;

export function playViolationAlarm(loop = true): void {
  try {
    // Jika alarm sudah sedang berbunyi, pastikan tetap menyala dan tidak menumpuk
    if (activeAudioElement) {
      activeAudioElement.loop = loop;
      if (activeAudioElement.paused) {
        activeAudioElement.currentTime = 0;
        activeAudioElement.play().catch(() => {});
      }
      return;
    }

    const audio = new Audio('/alarm.wav');
    audio.loop = loop;
    audio.volume = 1.0; // Volume penuh 100%

    // Pasang Web Audio API Gain + DynamicsCompressor Booster agar suara tetap kencang
    // meskipun volume perangkat dikecilkan sebagian
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const source = audioCtx.createMediaElementSource(audio);
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-50, audioCtx.currentTime);
        compressor.knee.setValueAtTime(40, audioCtx.currentTime);
        compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
        compressor.attack.setValueAtTime(0, audioCtx.currentTime);
        compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

        const gainNode = audioCtx.createGain();
        // Boost gain 3.5x lipat di atas normal
        gainNode.gain.setValueAtTime(3.5, audioCtx.currentTime);

        source.connect(compressor);
        compressor.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        activeAudioCtx = audioCtx;
      }
    } catch {
      // Jika MediaElementSource gagal, fallback langsung ke HTMLAudioElement standar
    }

    activeAudioElement = audio;
    audio.play().catch(() => {
      // Fallback synthesizer jika browser memblokir file atau file belum termuat
      playFallbackSynthAlarm();
    });
  } catch (err) {
    console.error('Gagal membunyikan alarm.wav:', err);
  }
}

export function stopViolationAlarm(): void {
  try {
    if (activeAudioElement) {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      activeAudioElement.src = '';
      activeAudioElement = null;
    }
    if (activeAudioCtx) {
      activeAudioCtx.close().catch(() => {});
      activeAudioCtx = null;
    }
  } catch {
    // Abaikan error saat menghentikan audio
  }
}

function playFallbackSynthAlarm(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(660, audioCtx.currentTime + 0.25);
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.5);
    gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      audioCtx.close().catch(() => {});
    }, 1000);
  } catch {
    // Abaikan
  }
}
