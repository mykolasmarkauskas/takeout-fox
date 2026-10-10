#!/usr/bin/env bash
# Normalise voice barks to -14 LUFS (short clips: compress, measure, gain, limit).
# usage: tools/voice_norm.sh public/audio/voice
set -euo pipefail
dir="$1"; tmp=$(mktemp -d)
for f in "$dir"/*.ogg; do
  ffmpeg -loglevel error -y -i "$f" -af "highpass=f=90,acompressor=threshold=-24dB:ratio=4:attack=5:release=80:makeup=6,apad=pad_dur=0.05" -ac 1 -ar 44100 "$tmp/c.wav"
  I=$(ffmpeg -hide_banner -i "$tmp/c.wav" -af ebur128 -f null - 2>&1 | grep -E '^\s+I:' | tail -1 | awk '{print $2}')
  G=$(python3 -c "print(round(-14-($I),2))")
  ffmpeg -loglevel error -y -i "$tmp/c.wav" -af "volume=${G}dB,alimiter=limit=0.89:level=false" -c:a libvorbis -q:a 5 "$tmp/out.ogg"
  I2=$(ffmpeg -hide_banner -i "$tmp/out.ogg" -af ebur128 -f null - 2>&1 | grep -E '^\s+I:' | tail -1 | awk '{print $2}')
  mv "$tmp/out.ogg" "$f"
  echo "$(basename "$f") $I -> $I2 LUFS"
done
rm -rf "$tmp"
