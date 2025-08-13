/*
  render-mp3.js
  Usage: node render-mp3.js "phrase here" 120 out.mp3
  Generates melodic MP3 (sine-based) piping PCM to ffmpeg.
*/
const fs = require('fs');
const cp = require('child_process');

const phrase = process.argv[2] || 'hello';
const bpm = parseInt(process.argv[3] || "120", 10);
const outFile = process.argv[4] || 'out.mp3';

const SR = 44100;
const CHANNELS = 1;

function charToNote(ch, idx) {
  const baseFreq = 220; // A3-ish
  const code = ch.charCodeAt(0);
  const scale = [0,2,4,7,9]; // pentatonic
  const val = scale[Math.abs(code + idx) % scale.length];
  const octaveShift = Math.floor(((code + idx) % 12) / 5);
  const semitone = val + octaveShift * 12;
  const freq = baseFreq * Math.pow(2, semitone/12);
  return freq;
}

function writeSine(buf, offset, freq, lengthSec, amp=0.35) {
  const twoPiF = 2 * Math.PI * freq;
  const samples = Math.floor(lengthSec * SR);
  for (let n=0; n<samples; n++) {
    const t = n / SR;
    const attack = Math.min(0.02, lengthSec*0.15);
    const release = Math.min(0.04, lengthSec*0.2);
    let env = 1.0;
    if (t < attack) env = t/attack;
    else if (t > lengthSec - release) env = Math.max(0, (lengthSec - t)/release);
    const sample = Math.sin(twoPiF * t) * amp * env;
    const s = Math.max(-1, Math.min(1, sample));
    const int16 = Math.round(s * 32767);
    buf.writeInt16LE(int16, offset + n*2);
  }
}

(async ()=>{
  const ffmpeg = cp.spawn('ffmpeg', ['-y', '-f','s16le','-ar',String(SR),'-ac',String(CHANNELS),'-i','pipe:0','-codec:a','libmp3lame','-q:a','2', outFile], { stdio: ['pipe','inherit','inherit'] });

  const beatSec = 60 / Math.max(1, bpm);
  const noteDur = beatSec * 0.9;
  const chars = phrase.split('').filter(c=>c.trim().length>0);
  const notes = chars.length ? chars : ['-'];

  for (let i=0;i<notes.length;i++){
    const freq = charToNote(notes[i], i);
    const len = noteDur;
    const samples = Math.floor(len * SR);
    const buf = Buffer.alloc(samples * 2);
    writeSine(buf, 0, freq, len, 0.22 + (i%3)*0.04);
    await new Promise((res,rej)=> ffmpeg.stdin.write(buf, (err)=> err ? rej(err) : res()) );
    const gap = Buffer.alloc(Math.floor(0.03*SR)*2);
    await new Promise((res,rej)=> ffmpeg.stdin.write(gap, (err)=> err ? rej(err) : res()) );
  }

  ffmpeg.stdin.end();
  ffmpeg.on('close', (code)=>{
    if (code === 0) {
      console.log('MP3 written to', outFile);
      process.exit(0);
    } else {
      console.error('ffmpeg exited with', code);
      process.exit(1);
    }
  });
})();
