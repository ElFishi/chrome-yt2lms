# yt2lms

A Chrome extension that sends a YouTube song or playlist from your current browser tab directly to a [Lyrion Music Server (LMS)](https://lyrion.org/) player — one click, no copy-pasting URLs.

## What it does

While you're on a YouTube or YouTube Music page, click the extension icon. If LMS is reachable and you have players connected, the popup lists them instantly. Click a player to start playing immediately, or add the music to its queue.

- **Song** — sends the current video as a single track
- **Playlist** — sends the full playlist
- **Download** — downloads the song or playlist to your music library via yt-dlp (requires the [YouTubeDL plugin](https://github.com/ElFishi/LMS-YouTubeDL))
- Works with both `youtube.com` and `music.youtube.com`
- Requires the [YouTube plugin for LMS](https://github.com/philippe44/LMS-YouTube)

## Screenshots

| Playlist | Config |
|----------|--------|
| ![Playlist](screenshots/playlist.png) | ![Config](screenshots/config.png) |

## Requirements

- Chrome (or any Chromium-based browser)
- [Lyrion Music Server](https://lyrion.org/) running and reachable from your browser
- [LMS YouTube plugin](https://github.com/philippe44/LMS-YouTube) installed in LMS
- At least one LMS player connected
- [YouTubeDL plugin](https://github.com/ElFishi/LMS-YouTubeDL) *(optional — required for the Download button)*

## Repository structure

```
/
  README.md
  LICENSE
  screenshots/
  .github/workflows/release.yml
  yt2lms/
    manifest.json
    popup.html
    popup.js
    popup.css
    icons.svg
    icon16.png
    icon32.png
    icon128.png
```

The `yt2lms/` folder is the extension itself. Everything outside it is repository metadata.

## Installation

Chrome extensions distributed outside the Web Store must be installed manually in Developer Mode. This is a one-time setup.

### Step 1 — Download

Go to the [Releases](../../releases) page and download the latest `yt2lms-X.X.zip` file. Unzip it anywhere permanent — the folder must not be deleted or moved after loading, as Chrome loads the extension directly from it.

### Step 2 — Enable Developer Mode

1. Open Chrome and navigate to `chrome://extensions`
2. Toggle **Developer mode** on (top-right corner)

### Step 3 — Load the extension

1. Click **Load unpacked**
2. Select the `yt2lms` folder inside the unzipped archive
3. The extension icon appears in your toolbar
4. Note the extension ID shown on the extension card — you will need it in the next step

### Step 4 — Allow the extension in LMS (CORS)

Because the extension makes requests directly to your LMS server from a `chrome-extension://` origin, LMS must be told to allow it.

1. Open the LMS web interface
2. Go to **Settings → Advanced → Security**
3. Find the **CORS Allowed Origins** (or **Allowed Origins**) field
4. Add your extension's origin in the form:
   ```
   chrome-extension://YOUR_EXTENSION_ID
   ```
   replacing `YOUR_EXTENSION_ID` with the ID from Step 3, e.g.:
   ```
   chrome-extension://iomdiebhiehhepmafkgkbkmigoegmmkj
   ```
5. Save and **restart LMS**

> **Note:** The extension ID is stable as long as you load the extension from the same folder. If you delete and reload it, or move the folder, Chrome assigns a new ID and you must update the LMS setting.

### Step 5 — Configure LMS in the extension

1. Click the extension icon on any page
2. Enter your LMS server URL (e.g. `http://lms:9000/` or `http://192.168.1.10:9000/`)
3. Click **Test** to verify the connection, then **Save**

The URL is stored locally in Chrome and remembered across sessions. To change it later, click the ⚙ icon in the popup header.

## Usage

1. Open any YouTube or YouTube Music page with a song or playlist
2. Click the **yt2lms** extension icon
3. If both a song ID and playlist ID are present in the URL, select **Song** or **Playlist** using the toggle
4. Click a player name to **play immediately**, or hover and use the **＋** button to **add to queue**

### Download

If the [YouTubeDL plugin](https://github.com/ElFishi/LMS-YouTubeDL) is installed in LMS, a **Download** button appears at the top of the player list. The extension checks for the plugin automatically — the button is greyed out and inactive if the plugin is not detected.

Clicking Download:
1. Sends a download request to LMS via JSON-RPC
2. Opens the yt-dlp download log in a new browser tab, which auto-refreshes every 2 seconds so you can watch the progress

The download runs as a background process in LMS. Playback is unaffected.

## Updating

When a new release is available:

1. Download the new zip from [Releases](../../releases)
2. Replace the contents of your existing `yt2lms` folder with the new files
3. Go to `chrome://extensions` and click the **↺ refresh** icon on the yt2lms card

The extension ID does not change as long as you update in place, so the LMS CORS setting remains valid.

## Troubleshooting

**Popup shows "no music" icon** — the current tab is not a YouTube page, or the URL has no video or playlist ID.

**Config screen appears every time** — LMS is not reachable at the saved URL. Check that LMS is running and that your browser can reach the address (try opening it directly in a tab).

**CORS error / fetch blocked** — the extension ID has not been added to LMS's CORS Allowed Origins, or LMS was not restarted after adding it. Follow Step 4 above.

**Players appear but nothing plays** — make sure the [LMS YouTube plugin](https://github.com/philippe44/LMS-YouTube) is installed. Without it, LMS cannot resolve YouTube URLs.

**Download button is greyed out** — the [YouTubeDL plugin](https://github.com/ElFishi/LMS-YouTubeDL) is not installed or not detected. Install it in LMS and reload the popup.

**After updating Chrome, the extension disappears** — Chrome occasionally disables manually-loaded extensions after major updates. Go to `chrome://extensions`, re-enable it, or reload the unpacked folder.

## License

MIT — see [LICENSE](LICENSE)

### Third-party attributions

Icons are derived from [Google Material Icons](https://fonts.google.com/icons), licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).