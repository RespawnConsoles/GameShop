const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gameshop', {
  getStore: () => ipcRenderer.invoke('store:get'),
  setStore: (state) => ipcRenderer.invoke('store:set', state),
});
