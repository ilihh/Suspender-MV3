# Changelog

## 1.0.6

- core: code improvements
- added changelog

## 1.0.5

- options: "Suspend tabs that contain unsaved form inputs" renamed to "Never suspend..."
- options: "Tab Icons" move to the "Suspended tabs" block
- options: done preparations to make the contextMenus permission optional
- core: code improvements

## 1.0.4

- bugfix: error on chrome error pages (those pages will not be suspended)
- bugfix: "Never suspend this domain" now works with "files://"
- bugfix: media keys do not reset suspend delay for the YouTube tabs
- core: move config to separate with fields only
- core: reload config on storage.onChanged instead of onMessage
- core: ensure all messages are processed
- core: use session storage for the temporary data
- other: icon replaced
- options: added option "Suspend active tabs"
- options: added option "Suspend tabs that contain unsaved form inputs"
- options: added option "Tab Icons"
- suspender: lazy load device status
- suspender: lazy load files scheme allowed
 
## 1.0.3

- suspended page: fixed link and updated style
- options: combine set value and listeners with option to update value later
- options: added session rename
- options: sessions are displayed from newest to oldest
- options: increased page width
- config: added favicon modes - no dim, google (requires access to google), actual (requires access to all urls)
- readme: added instruction on build from source
- migrate: added instruction and improved ID validation

## 1.0.2

- bugfix: icons are not updated on browser restart
- bugfix: empty recent sessions
- bugfix: a context menu is not displayed at start
- bugfix: duplication errors in the context menu  
- bugfix: commands: "suspend group/window/all" are not working
- options: update values on external change
- options: added missed recent sessions header
- action: extension icon is now changed based on the tab status
- tabs: dim icon if icon is data image

## 1.0.1

- bugfix: fixed incorrect delay

## 1.0.0

- initial release