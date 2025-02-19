const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  fetchUrl: (url) => ipcRenderer.invoke('fetch-url', url),
  startSessionCapture: (url) => ipcRenderer.invoke('start-session-capture', url),
  openInBrowser: (url) => shell.openExternal(url)
});
