# yt-dlp (local)

`npm install` downloads the official standalone binary for the current
platform and verifies its SHA-256 checksum:

- Windows: `tools/yt-dlp.exe`
- Linux/macOS: `tools/yt-dlp`

Set `YT_DLP_PATH` to use a preinstalled binary instead. Set
`YT_DLP_SKIP_INSTALL=true` to skip the download, or
`YT_DLP_FORCE_INSTALL=true` to replace an existing local binary.

The installer downloads from the direct GitHub release URL instead of the
rate-limited GitHub API. A download failure is non-fatal by default so an
external outage cannot block the whole application deploy. Set
`YT_DLP_INSTALL_REQUIRED=true` when the deployment must fail without yt-dlp,
or set `YT_DLP_RELEASE_BASE_URL` to use a trusted release mirror.

## YouTube processing flow

Flow:

1. Try YouTube captions (`youtube-transcript`)
2. If none → use `yt-dlp` to download the best audio stream
3. Transcribe the downloaded audio with Whisper

## Production: YouTube bot check

Datacenter IPs (Railway, Render, AWS, …) often get:

`Sign in to confirm you're not a bot`

Fix: pass **Netscape cookies** from a logged-in YouTube browser session.

### Export cookies

1. On a normal desktop browser, sign in to [youtube.com](https://www.youtube.com).
2. Export cookies in **Netscape** format (extension such as “Get cookies.txt LOCALLY”,
   or follow [yt-dlp wiki — exporting YouTube cookies](https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies)).
3. Prefer a **fresh Firefox profile** dedicated to this (cookies last ~1–2 weeks; refresh when downloads fail again).

### Configure the server

**Option A — file path**

```bash
YT_DLP_COOKIES_PATH=/data/youtube-cookies.txt
```

Mount/copy the exported file to that path on the host.

**Option B — env secret (base64)** — convenient for Railway / Docker secrets:

```bash
# Linux / macOS
base64 -w0 youtube-cookies.txt
# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("youtube-cookies.txt"))
```

```bash
YT_DLP_COOKIES_BASE64="<paste base64 here>"
```

The app writes `storage/youtube-cookies.txt` at runtime and passes `--cookies` to yt-dlp.

### Optional

- `YT_DLP_PROXY`: residential proxy URL (helps if the server IP is heavily flagged)
- `YT_DLP_FORCE_IPV4=true`: disable IPv6
- `YT_DLP_EXTRACTOR_ARGS`: default `youtube:player_client=android,tv,web`

### Notes

- Cookies expire; re-export when Whisper/audio download starts failing again.
- Videos **with English captions** skip yt-dlp audio download (caption path only).
- Do **not** commit cookie files to git (`storage/` is ignored).

Required for:

- video metadata (falls back to oEmbed if yt-dlp fails)
- audio download when the YouTube video has no captions (Whisper path)
