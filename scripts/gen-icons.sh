#!/bin/bash
set -e
SRC=public/icon-512.svg
which rsvg-convert && CONVERT=rsvg-convert
which convert && CONVERT=convert
if [ -z "$CONVERT" ]; then
  echo "no rsvg or imagemagick"
  exit 1
fi
for size in 192 512; do
  if [ "$CONVERT" = "rsvg-convert" ]; then
    rsvg-convert -w $size -h $size $SRC -o public/icon-${size}.png
  else
    convert -background none -resize ${size}x${size} $SRC public/icon-${size}.png
  fi
  echo "Generated public/icon-${size}.png"
done
