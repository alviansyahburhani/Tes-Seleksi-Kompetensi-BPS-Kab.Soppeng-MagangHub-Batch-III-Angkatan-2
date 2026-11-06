'use client';

import { Fragment, useMemo } from 'react';
import katex from 'katex';

/**
 * Menampilkan teks soal yang mungkin memuat rumus matematika (LaTeX) sebagai rumus visual (KaTeX).
 *
 * Menggunakan paket npm `katex` yang dibundel langsung di aplikasi (bukan CDN), sehingga
 * rumus dirender secara sinkron pada render pertama — 0ms jeda, tanpa kedipan teks mentah,
 * dan tetap berfungsi penuh meskipun koneksi internet peserta lambat/terputus.
 *
 * Format rumus yang dikenali:
 *  1. Dengan pembatas : $...$  \(...\)  (inline)   |   $$...$$  \[...\]  (blok tengah)
 *  2. Tanpa pembatas  : baris yang memuat perintah LaTeX seperti \frac, \sqrt, \times, \div, dst.
 *     (hasil copy langsung dari editor rumus). Jika baris diawali kalimat biasa, hanya bagian
 *     mulai dari perintah LaTeX pertama sampai akhir baris yang dirender sebagai rumus.
 *
 * Aman dipakai untuk soal biasa: teks tanpa rumus tampil persis seperti sebelumnya.
 */

type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'math'; value: string; display: boolean };

// $$...$$ | \[...\] | \(...\) | $...$
const DELIMITER_RE = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g;
// Pembatas $...$ hanya dianggap rumus jika isinya terlihat seperti LaTeX (menghindari salah deteksi "$5 dan $10")
const LATEX_HINT_RE = /[\\^_{}]/;
// Perintah LaTeX umum untuk deteksi rumus tanpa pembatas (daftar putih, agar "C:\Users" tidak salah deteksi)
const BARE_COMMAND_RE =
  /\\(?:d?frac|sqrt|times|div|cdot|left|right|pm|mp|leq?|geq?|neq|approx|sum|prod|int|lim|log|ln|sin|cos|tan|text|mathrm|mathbf|overline|underline|infty|pi|alpha|beta|theta|Delta|Rightarrow|rightarrow|%|binom)(?![a-zA-Z])/;

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];

  // 1. Rumus dengan pembatas
  let last = 0;
  let foundDelimited = false;
  for (const m of text.matchAll(DELIMITER_RE)) {
    const display = m[1] !== undefined || m[2] !== undefined;
    const value = m[1] ?? m[2] ?? m[3] ?? m[4] ?? '';
    if (m[4] !== undefined && !LATEX_HINT_RE.test(value)) continue;

    const idx = m.index ?? 0;
    if (idx > last) segments.push({ kind: 'text', value: text.slice(last, idx) });
    segments.push({ kind: 'math', value: value.trim(), display });
    last = idx + m[0].length;
    foundDelimited = true;
  }
  if (foundDelimited) {
    if (last < text.length) segments.push({ kind: 'text', value: text.slice(last) });
    return segments;
  }

  // 2. Rumus tanpa pembatas (per baris)
  const lines = text.split('\n');
  let buffer: string[] = [];
  let foundBare = false;

  const flushText = (extra?: string) => {
    const joined = [...buffer, ...(extra !== undefined ? [extra] : [])].join('\n');
    if (joined) segments.push({ kind: 'text', value: joined });
    buffer = [];
  };

  for (const line of lines) {
    const cmd = BARE_COMMAND_RE.exec(line);
    if (!cmd) {
      buffer.push(line);
      continue;
    }
    foundBare = true;
    const prefix = line.slice(0, cmd.index);
    const isWholeLineMath = !/[A-Za-z]{3,}/.test(prefix);
    if (isWholeLineMath) {
      flushText();
      segments.push({ kind: 'math', value: line.trim(), display: true });
    } else {
      flushText(prefix);
      segments.push({ kind: 'math', value: line.slice(cmd.index).trim(), display: true });
    }
  }
  if (!foundBare) return [{ kind: 'text', value: text }];
  flushText();
  return segments;
}

interface MathTextProps {
  text: string;
  className?: string;
}

export default function MathText({ text, className }: MathTextProps) {
  const segments = useMemo(() => parseSegments(text || ''), [text]);
  const hasMath = segments.some((s) => s.kind === 'math');

  // Soal tanpa rumus -> tampilkan teks apa adanya
  if (!hasMath) {
    return <div className={className}>{text}</div>;
  }

  return (
    <div className={className}>
      {segments.map((seg, i) => {
        if (seg.kind === 'text') {
          let value = seg.value;
          // Hindari baris kosong berlebih di sekitar rumus blok
          if (segments[i - 1]?.kind === 'math' && (segments[i - 1] as { display: boolean }).display) {
            value = value.replace(/^\n/, '');
          }
          if (segments[i + 1]?.kind === 'math' && (segments[i + 1] as { display: boolean }).display) {
            value = value.replace(/\n$/, '');
          }
          return <Fragment key={i}>{value}</Fragment>;
        }

        const html = katex.renderToString(seg.value, {
          displayMode: seg.display,
          throwOnError: false,
          output: 'html',
        });
        return seg.display ? (
          <div
            key={i}
            className="my-3 overflow-x-auto overflow-y-hidden py-1 whitespace-normal"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <span
            key={i}
            className="whitespace-normal"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </div>
  );
}
