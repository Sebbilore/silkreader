#!/bin/bash
# bash scripts/trailer/build2.sh <frames> <musik.wav> <ausgabe>: Frames → Szenen → Überblendung → MP4 mit Musik
set -e
FR=$1; M=$2; O=$3; mkdir -p "$O"
D=(4.5 5.5 5 7.5 5.5 4.5 6.5 4.5); X=0.5
args=(); for i in 1 2 3 4 5 6 7 8; do ffmpeg -loglevel error -y -framerate 30 -i "$FR/s$i/%04d.jpg" -c:v libx264 -crf 14 -preset fast -pix_fmt yuv420p "$O/c$i.mp4"; args+=(-i "$O/c$i.mp4"); done
f=""; off=0; prev="[0:v]"
for i in 1 2 3 4 5 6 7; do off=$(echo "$off + ${D[$((i-1))]} - $X" | bc); nxt="[v$i]"; f+="$prev[$i:v]xfade=transition=fade:duration=$X:offset=$off$nxt;"; prev=$nxt; done
ffmpeg -loglevel error -y "${args[@]}" -i "$M" -filter_complex "${f%;}" -map "$prev" -map 8:a -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p -r 30 -c:a aac -b:a 128k -t 40 -movflags +faststart "$O/silkreader-trailer-en.mp4"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$O/silkreader-trailer-en.mp4"
