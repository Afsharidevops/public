// Server configurations
const SERVERS = [
  {
    id: 'server0',
    name: 'Test Server',
    host: '10.10.10.80',
    port: 1080,
    type: 'socks5'
  },
  {
    id: 'server1',
    name: 'Staging Server',
    host: '192.168.130.19',
    port: 1080,
    type: 'socks5'
  },
  {
    id: 'server2',
    name: 'Prod Server',
    host: '192.168.150.19',
    port: 1080,
    type: 'socks5'
  }
  // Add more servers as needed
];

let connected = false;
let currentServerId = 'server1'; // Default server

// Initialize connection state from storage
chrome.storage.local.get(['status', 'serverId'], function(data) {
  if (data.serverId) {
    currentServerId = data.serverId;
  }
  
  if (data.status === 'connected') {
    connected = true;
    updateIcon(true);
  }
});

// Get current server config
function getCurrentServer() {
  return SERVERS.find(server => server.id === currentServerId) || SERVERS[0];
}

// Connect to the VPN using selected server
function connectToVPN() {
  const server = getCurrentServer();
  
  const config = {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: server.type,
        host: server.host,
        port: server.port
      },
      bypassList: ["localhost"]
    }
  };
  
  chrome.proxy.settings.set(
    {value: config, scope: 'regular'},
    function() {
      connected = true;
      chrome.storage.local.set({status: 'connected', serverId: currentServerId});
      updateIcon(true);
      console.log("Connected to VPN using server:", server.name);
    }
  );
}

// Disconnect from the VPN
function disconnectFromVPN() {
  chrome.proxy.settings.clear(
    {scope: 'regular'},
    function() {
      connected = false;
      chrome.storage.local.set({status: 'disconnected'});
      updateIcon(false);
      console.log("Disconnected from VPN");
    }
  );
}

// Update the extension icon based on connection status
function updateIcon(isConnected) {
  const iconPath = isConnected ? 
    "images/icon_connected.png" : 
    "images/icon16.png";
  
  chrome.action.setIcon({path: iconPath});
}

// Add this function to check actual proxy settings
function checkProxySettings(callback) {
  chrome.proxy.settings.get({}, function(config) {
    const server = getCurrentServer();
    const isConnected = config.value.mode === "fixed_servers" && 
                      config.value.rules && 
                      config.value.rules.singleProxy && 
                      config.value.rules.singleProxy.host === server.host;
    callback(isConnected);
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log("Received message:", request.action);
    
    if (request.action === "connect") {
      connectToVPN();
      sendResponse({status: "connected", server: getCurrentServer()});
    } else if (request.action === "disconnect") {
      disconnectFromVPN();
      sendResponse({status: "disconnected"});
    } else if (request.action === "getStatus") {
      checkProxySettings(function(isProxyActive) {
        if (connected !== isProxyActive) {
          connected = isProxyActive;
          chrome.storage.local.set({status: isProxyActive ? 'connected' : 'disconnected'});
          updateIcon(isProxyActive);
        }
        sendResponse({status: connected ? "connected" : "disconnected", server: getCurrentServer()});
      });
      return true; // Keep connection open for async response
    } else if (request.action === "getServers") {
      sendResponse({servers: SERVERS, currentServerId: currentServerId});
    } else if (request.action === "setServer") {
      currentServerId = request.serverId;
      chrome.storage.local.set({serverId: currentServerId});
      sendResponse({success: true, server: getCurrentServer()});
    }
    return true; // Required for async response
  }
);

// Initialize extension state when installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('VPN Extension installed');
  chrome.storage.local.get(['status', 'serverId'], function(data) {
    if (data.serverId) {
      currentServerId = data.serverId;
    }
    
    if (data.status === 'connected') {
      connectToVPN();
    }
  });
});

// Keep service worker active
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started, initializing VPN extension');
  chrome.storage.local.get(['status', 'serverId'], function(data) {
    if (data.serverId) {
      currentServerId = data.serverId;
    }
    
    if (data.status === 'connected') {
      connectToVPN();
    }
  });
});
