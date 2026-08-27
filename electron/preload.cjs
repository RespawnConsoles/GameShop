const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gameshop', {
  getStore: () => ipcRenderer.invoke('store:get'),
  setStore: (state) => ipcRenderer.invoke('store:set', state),
  uploadGame: () => ipcRenderer.invoke('game:upload'),
  pickGameIcon: () => ipcRenderer.invoke('game:pickIcon'),
  deleteUpload: (id) => ipcRenderer.invoke('game:deleteUpload', id),
});
