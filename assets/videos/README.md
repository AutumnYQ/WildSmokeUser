# Optional study videos

The default smoke-reconstruction study already uses the extracted animations in `assets/gifs/`.
Use this folder only if you want to replace them with MP4/WebM files or add new trials.

You may choose any filenames; update each `reference.src` and `candidates[].src` path in
`config.js`. Every trial must contain one fixed GT/reference and two or three candidates.

For broad browser compatibility, use H.264 video in an MP4 container, keep every comparison at the
same resolution/frame rate when possible, remove identifying filenames from visible captions, and
avoid very large files because GitHub Pages has bandwidth limits.
