# Footer ocean video

Put a free-licence clip of dolphins swimming (Pexels or Pixabay, "dolphins underwater", licence allows commercial use without attribution) here as `ocean-source.mp4`, then make the loop:

    ffmpeg -y -ss 0 -t 24 -i ocean-source.mp4 -vf "scale=1280:-2,fps=24" -c:v libx264 -crf 28 -preset slow -pix_fmt yuv420p -an -movflags +faststart ocean.mp4
    ffmpeg -y -ss 3 -i ocean.mp4 -frames:v 1 -vf "scale=1600:-2" -q:v 4 ocean-poster.jpg

Then in `js/site.js` set `FT_VIDEO='img/video/ocean.mp4'` (and the poster to `img/video/ocean-poster.jpg`). Target under 4 MB for the mp4; 20 to 30 seconds; it loops muted. Note the source and licence in `site/img/CREDITS.md`.
