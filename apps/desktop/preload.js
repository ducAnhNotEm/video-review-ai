const { contextBridge, ipcRenderer } = require('electron');

contextBridge.revealInMainWorld('electronAPI', {
  invoke: (channel, ...args) => {
    // Whitelist channels to secure IPC
    const validChannels = [
      'projects:list',
      'projects:create',
      'projects:get',
      'projects:delete',
      'file:upload',
      'timeline:get',
      'timeline:save',
      'ai:transcribe',
      'ai:generateScript',
      'video:compile',
      'assets:list',
      'assets:add',
      'assets:delete'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Unauthorized IPC channel: ${channel}`));
  }
});
