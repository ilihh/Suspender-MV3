# Suspender MV3

A free and open-source Tabs Suspender with Manifest V3 support, inspired by The Great Suspender extension.

## Features

- Automatically suspends inactive tabs after a configurable delay to free up memory and CPU usage
- Optional scroll position saving
- Optional YouTube timestamp saving
- Optional sessions export/import support

## Chrome Web Store

Suspender MV3 is [available at the official Chrome Web Store](https://chromewebstore.google.com/detail/suspender-mv3/cgghgpidclbldljbcdnmejgfgioehjfh).

## Install as an extension

1. Download the *Suspender.MV3* 7z archive from Releases
2. Unpack the archive
3. Open extensions page in your browser (*chrome://extensions/*)
4. Enable **Developer Mode**
5. Press the "Load Unpacked" button and select an unpacked folder with *manifest.json*

## Install as an extension from source

1. Clone this repository or download the **[source code](https://github.com/ilihh/Suspender-MV3/archive/refs/heads/main.zip)**
2. Unpack the archive
3. Run `npm install` in the unpacked folder (you must have Node.js installed)
4. Run `npm run build` in the unpacked folder, the built extension will be located in the *dist* folder 
5. Open extensions page in your browser (*chrome://extensions/*)
6. Enable **Developer Mode**
7. Press the "Load Unpacked" button and select created *dist* folder

## Migration from other extensions

1. Open extension settings
2. Go to "Migrate" section
3. Follow instructions on that section

## Settings with optional permissions

- **Suspend file:// tabs**: Option "Allow access to file URLs" must be enabled on the Chrome extension page. Warning: changing this option will close all suspended pages of this extension. Back up session before doing this. 
- **Tab Icons**: requires access to all URLs or to google.com for the dimmed icons.
- **Never suspend tabs that contain unsaved form inputs**: requires access to all URLs and permission to execute scripts.
- **Restore scroll position**: requires access to all URLs and permission to execute scripts.
- **Save YouTube timestamps for the tab with video**: requires access to https://www.youtube.com/watch* and permission to execute scripts.
- **Remove suspended pages from history**: requires access to the history.
