/**
 * Memutar file audio murni `/alarm.wav` dari folder `public` secara instan saat peserta keluar tab
 * (tanpa synthesizer buatan dan tanpa distorsi compressor).
 *
 * Agar suara langsung berbunyi tepat pada saat keluar tab (ketika `document.hidden === true`)
 * dan tidak ditunda oleh browser hingga peserta kembali ke tab ujian:
 * 1. File `/alarm.wav` di-fetch dan di-decode lebih awal menjadi `AudioBuffer` di memori.
 * 2. Saat peserta pertama kali klik / sentuh / tekan tombol (`unlockViolationAlarm()`),
 *    `AudioContext` diaktifkan (`running`) dan elemen `HTMLAudioElement('/alarm.wav')` di-unlock.
 * 3. Saat peserta keluar tab, `AudioBufferSourceNode` memutar buffer `/alarm.wav` secara instan
 *    meskipun tab berada di background.
 */

let sharedAudioCtx: AudioContext | null = null;
let decodedAlarmBuffer: AudioBuffer | null = null;
let isFetchingBuffer = false;

let activeBufferSource: AudioBufferSourceNode | null = null;
let unlockedAudioEl: HTMLAudioElement | null = null;
let isAudioElUnlocked = false;
let activeAudioElement: HTMLAudioElement | null = null;

function getAudioContextClass(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext || (window as any).webkitAudioContext;
}

function preloadAlarmBuffer(ctx: AudioContext): void {
  if (decodedAlarmBuffer || isFetchingBuffer || typeof window === 'undefined') return;
  isFetchingBuffer = true;

  fetch('/alarm.wav')
    .then((res) => res.arrayBuffer())
    .then((arrayBuf) => ctx.decodeAudioData(arrayBuf))
    .then((audioBuf) => {
      decodedAlarmBuffer = audioBuf;
    })
    .catch(() => {
      isFetchingBuffer = false;
    });
}

/**
 * Siapkan AudioContext + preload buffer `/alarm.wav` + unlock HTMLAudioElement.
 * Dipanggil dari interaksi pengguna (pointerdown / keydown / touchstart) di halaman ujian.
 */
export function unlockViolationAlarm(): void {
  try {
    const AudioContextClass = getAudioContextClass();
    if (AudioContextClass) {
      if (!sharedAudioCtx) {
        sharedAudioCtx = new AudioContextClass();
      }
      if (sharedAudioCtx.state !== 'running') {
        sharedAudioCtx.resume().catch(() => {});
      }
      preloadAlarmBuffer(sharedAudioCtx);
    }

    if (!unlockedAudioEl && typeof window !== 'undefined') {
      const audio = new Audio('/alarm.wav');
      audio.preload = 'auto';
      audio.volume = 1.0;
      audio.load();
      unlockedAudioEl = audio;
    }

    // Unlock HTMLAudioElement dengan micro-play senyap saat interaksi pertama agar browser
    // mengizinkan pemutaran instan meskipun tab sedang berada di background
    if (unlockedAudioEl && !isAudioElUnlocked && !activeAudioElement) {
      isAudioElUnlocked = true;
      unlockedAudioEl.muted = true;
      const playPromise = unlockedAudioEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (activeAudioElement !== unlockedAudioEl) {
              unlockedAudioEl!.pause();
              unlockedAudioEl!.currentTime = 0;
            }
            unlockedAudioEl!.muted = false;
          })
          .catch(() => {
            unlockedAudioEl!.muted = false;
            isAudioElUnlocked = false;
          });
      } else {
        unlockedAudioEl.muted = false;
      }
    }
  } catch {
    // Abaikan
  }
}

export function playViolationAlarm(loop = true): void {
  try {
    // Jika sudah sedang berbunyi (baik via BufferSource maupun HTMLAudioElement), jangan ditumpuk
    if (activeBufferSource) {
      activeBufferSource.loop = loop;
      return;
    }
    if (activeAudioElement && !activeAudioElement.paused) {
      activeAudioElement.loop = loop;
      return;
    }

    // Prioritas 1: Putar buffer murni `/alarm.wav` melalui Web Audio API jika sudah siap & running.
    // Cara ini 100% langsung berbunyi saat pindah tab (tidak di-delay browser sampai kembali ke tab).
    if (sharedAudioCtx && decodedAlarmBuffer) {
      if (sharedAudioCtx.state !== 'running') {
        sharedAudioCtx.resume().catch(() => {});
      }
      if (sharedAudioCtx.state === 'running') {
        const source = sharedAudioCtx.createBufferSource();
        source.buffer = decodedAlarmBuffer;
        source.loop = loop;
        source.connect(sharedAudioCtx.destination);
        source.onended = () => {
          if (activeBufferSource === source) {
            activeBufferSource = null;
          }
        };
        source.start(0);
        activeBufferSource = source;
        return;
      }
    }

    // Prioritas 2: Putar elemen HTMLAudioElement `/alarm.wav` yang sudah di-unlock
    const audio = unlockedAudioEl || new Audio('/alarm.wav');
    audio.muted = false;
    audio.volume = 1.0;
    audio.loop = loop;
    audio.currentTime = 0;
    activeAudioElement = audio;
    audio.play().catch(() => {});
  } catch (err) {
    console.error('Gagal membunyikan alarm.wav:', err);
  }
}

export function stopViolationAlarm(): void {
  try {
    if (activeBufferSource) {
      try {
        activeBufferSource.onended = null;
        activeBufferSource.stop();
        activeBufferSource.disconnect();
      } catch {}
      activeBufferSource = null;
    }

    if (activeAudioElement) {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      if (activeAudioElement !== unlockedAudioEl) {
        activeAudioElement.src = '';
      }
      activeAudioElement = null;
    }
  } catch {
    // Abaikan error saat menghentikan audio
  }
}
