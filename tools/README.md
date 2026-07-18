# yt-dlp (local)

`npm install` downloads the official standalone binary for the current
platform and verifies its SHA-256 checksum:

- Windows: `tools/yt-dlp.exe`
- Linux/macOS: `tools/yt-dlp`

Set `YT_DLP_PATH` to use a preinstalled binary instead. Set
`YT_DLP_SKIP_INSTALL=true` to skip the download, or
`YT_DLP_FORCE_INSTALL=true` to replace an existing local binary.

Required for:

- video metadata
- audio download when the YouTube video has no captions (Whisper path)
