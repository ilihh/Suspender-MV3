# Changelog

## 1.0.10

- small performance optimization

## 1.0.9

- core: added dark theme
- options: added the Theme option
- options: added localization support for the About section
- options: session button "Export" now properly updated if settings were changed in another tab
- no more tags in messages.json
- options.ts: moved classes to separate files

## 1.0.8

- action (popup): default icon changed to the off one
- action (popup): added progressbar for the long operation
- options: added warning for the "Suspend file:// tabs" option
- options: added progressbar for the Migrate process
- readme: added the "Suspend file:// tabs" option
- suspended: added "Set keyboard shortcuts" link

## 1.0.7

- bugfix: file:// permission cannot be requested
- options: added "Suspend local files" option
- options: "Never suspend unsaved data" is now disabled by default since it requires permission

## 1.0.6

- core: code improvements
- added changelog

## 1.0.5

- options: "Suspend tabs that contain unsaved form inputs" renamed to "Never suspend..."
- options: "Tab Icons" move to the "Suspended tabs" block
- options: done preparations to make the contextMenus permission optional
- core: code improvements

## 1.0.4

- bugfix: error on Chrome error pages (those pages will not be suspended)
- bugfix: "Never suspend this domain" now works with "file://"
- bugfix: media keys do not reset suspend delay for the YouTube tabs
- core: move config to a separate class with fields only
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
- options: combine set value and listeners with the option to update value later
- options: added session rename
- options: sessions are displayed from newest to oldest
- options: increased page width
- config: added favicon modes - no dim, google (requires access to Google), actual (requires access to all URLs)
- readme: added instructions on building from source
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
- tabs: dim icon if icon is a data image

## 1.0.1

- bugfix: fixed incorrect delay

## 1.0.0

- initial release