#!/bin/bash
# Trailer zusammensetzen: bash scripts/trailer/build.sh <standbilder> <ausgabe>   (ffmpeg, Schrift Inter)
set -e
S=$1; O=$2; T=$O/txt; mkdir -p "$O" "$T"
F=/usr/share/fonts/opentype/inter
fps=30
# Szene: Bild, Dauer, Zoomgewinn, FX, FY, Textdatei, Layout (R = rechts, C = Mitte)
scene() { # n dur zoom fx fy layout
  local n=$1 d=$2 z=$3 fx=$4 fy=$5 lay=$6 N=$(echo "$2 * 30 / 1" | bc)
  local zp="zoompan=z='1+$z*on/$N':x='(iw-iw/zoom)*$fx':y='(ih-ih/zoom)*$fy':d=$N:s=1920x1080:fps=$fps"
  local txt=""
  if [ "$lay" = R ]; then
    txt=",drawbox=x=1130:y=ih/2-170:w=90:h=8:color=0xd6246e:t=fill:enable='gte(t,0.5)',drawtext=fontfile=$F/Inter-Bold.otf:textfile=$T/$n.txt:fontsize=68:fontcolor=0x1b1b1f:line_spacing=16:x=1130:y=(h-text_h)/2:alpha='min(1,max(0,(t-0.5)/0.5))'"
  fi
  ffmpeg -loglevel error -y -i "$S/${7:-s$n}.png" -vf "$zp$txt$8" -t $d -c:v libx264 -crf 14 -preset fast -pix_fmt yuv420p "$O/c$n.mp4"
}
printf 'Got a letter you\ndon'"'"'t quite\nunderstand?' > $T/1.txt
printf 'Just highlight\nthe text.' > $T/2.txt
printf 'Tap the spider.' > $T/3.txt
printf 'See what matters:\nhow much,\nand by when.' > $T/4.txt
printf 'It can read it\nout loud, too.' > $T/5.txt
printf 'Warns you about\nscam letters.' > $T/6.txt
printf 'Runs on your PC.' > $T/7a.txt
printf 'Your letters aren'"'"'t sent anywhere.' > $T/7b.txt
printf 'Only what you highlight is read.\nNo account. No ads. No tracking.' > $T/7c.txt
printf 'Silkreader' > $T/8a.txt
printf 'Understand your letters.' > $T/8b.txt
printf 'Free on the Microsoft Store.' > $T/8c.txt
printf 'AI can make mistakes. Please check amounts and deadlines in the original.' > $T/8d.txt
c() { echo "drawtext=fontfile=$F/$1.otf:textfile=$T/$2.txt:fontsize=$3:fontcolor=$4:line_spacing=12:x=(w-text_w)/2:y=$5:alpha='min(1,max(0,(t-$6)/0.5))'"; }
scene 1 4.5 0.28 0.12 0.32 R
scene 2 5.5 0.22 0.05 0.40 R
scene 3 5 0.45 0.55 0.0 R
scene 4 7.5 0.32 0.0 0.20 R
scene 5 5.5 0.30 0.0 0.0 R
scene 6 4.5 0.25 0.0 0.10 R
scene 7 6.5 0.05 0.5 0.5 C s7 ",$(c Inter-Bold 7a 76 0x1b1b1f 520 0.4),$(c Inter-Bold 7b 52 0x1b1b1f 630 1.0),$(c Inter-Regular 7c 36 0x555555 740 2.0)"
scene 8 4.5 0.05 0.5 0.5 C s8 ",$(c Inter-Bold 8a 88 0x1b1b1f 460 0.4),$(c Inter-Medium 8b 56 0xd6246e 580 0.9),$(c Inter-Regular 8c 38 0x444444 670 1.4),$(c Inter-Regular 8d 24 0x777777 990 1.4)"
# Überblendungen (je 0,5 s): Längen 43,5 s − 3,5 s = 40 s
D=(4.5 5.5 5 7.5 5.5 4.5 6.5 4.5); X=0.5
args=(); for i in 1 2 3 4 5 6 7 8; do args+=(-i "$O/c$i.mp4"); done
f=""; off=0; prev="[0:v]"
for i in 1 2 3 4 5 6 7; do
  off=$(echo "$off + ${D[$((i-1))]} - $X" | bc)
  nxt="[v$i]"; f+="$prev[$i:v]xfade=transition=fade:duration=$X:offset=$off$nxt;"; prev=$nxt
done
ffmpeg -loglevel error -y "${args[@]}" -f lavfi -t 60 -i anullsrc=r=44100:cl=stereo -filter_complex "${f%;}" -map "$prev" -map 8:a -c:v libx264 -crf 17 -preset medium -pix_fmt yuv420p -r 30 -c:a aac -b:a 32k -shortest -movflags +faststart "$O/silkreader-trailer-en.mp4"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$O/silkreader-trailer-en.mp4"
