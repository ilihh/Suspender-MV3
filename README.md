# Suspender MV3

A free and open-source Tabs Suspender with Manifest V3 support, inspired by The Great Suspender extension.

Once installed and enabled, this extension will automatically *suspend* tabs that have not been used for a default, or user-configurable, time interval. As a result, resources such as memory and CPU that the tab was consuming are freed.

## Features

- Automatically suspends inactive tabs after a configurable delay
- Frees up memory and CPU usage
- Optional scroll position saving
- Optional YouTube timestamp saving
- Optional sessions export/import support

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

1. **Restore scroll position and enable dimmed tabs icons**: requires permissions to access all URLs and execute scripts.
2. **Save YouTube timestamps for the tab with video**: requires permissions to access "https://www.youtube.com/watch*" and execute scripts.
3. **Remove suspended pages from history**: requires history access
4. **Sessions export**: requires downloads permissions
