# Suspender MV3

A free and open-source Tabs Suspender with Manifest V3 support.

Once installed and enabled, this extension will automatically *suspend* tabs that have not been used for a default, or user-configurable, time interval. As a result, resources such as memory and CPU that the tab was consuming are freed.

## Installation for Chromium-based browsers

1. Download the *Source code (zip)* archive from Releases
2. Unpack the archive
3. Open the extensions page (*chrome://extensions/*)
4. Enable **Developer Mode**
5. Press the "Load Unpacked" button and select a folder with *manifest.json*

## Migration from other extensions

1. Open extension settings
2. Go to "Migrate" section
3. Enter 32 letters code of other extension, it is symbols between slashes in the extension page: chrome-extension://**liekplgjlphohhlnfaibkdjindpnfimg**/suspended.html 
4. Press "Migrate"

## Settings with optional permissions

1. **Restore scroll position and enable dimmed tabs icons**: requires permissions to access all URLs and execute scripts.
2. **Save YouTube timestamps for the tab with video**: requires permissions to access "https://www.youtube.com/watch*" and execute scripts.
3. **Remove suspended pages from history**: requires history access
4. **Sessions export**: requires downloads permissions
