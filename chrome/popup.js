document.addEventListener('DOMContentLoaded', function() {
  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const statusDiv = document.getElementById('status');
  const serverSelect = document.getElementById('serverSelect');
  const serverInfo = document.getElementById('serverInfo');
  
  // Load available servers
  loadServers();
  
  // Check current status when popup opens
  checkStatus();
  
  // Server selection change
  serverSelect.addEventListener('change', function() {
    const selectedServerId = serverSelect.value;
    
    chrome.runtime.sendMessage({action: "setServer", serverId: selectedServerId}, function(response) {
      if (chrome.runtime.lastError) {
        console.error("Error setting server:", chrome.runtime.lastError);
        return;
      }
      
      updateServerInfo(response.server);
    });
  });
  
  // Connect button action
  connectBtn.addEventListener('click', function() {
    connectBtn.disabled = true;
    statusDiv.textContent = "Status: Connecting...";
    
    // Add spinning animation to logo
    document.querySelector('.logo').classList.add('connecting');
    
    chrome.runtime.sendMessage({action: "connect"}, function(response) {
      // Remove animation
      document.querySelector('.logo').classList.remove('connecting');
      
      if (chrome.runtime.lastError) {
        statusDiv.textContent = "Status: Error connecting";
        statusDiv.className = "status disconnected";
        connectBtn.disabled = false;
        return;
      }
      
      statusDiv.textContent = "Status: Connected";
      statusDiv.className = "status connected";
      updateServerInfo(response.server);
      updateButtons(true);
    });
  });
  
  // Disconnect button action
  disconnectBtn.addEventListener('click', function() {
    disconnectBtn.disabled = true;
    statusDiv.textContent = "Status: Disconnecting...";
    
    chrome.runtime.sendMessage({action: "disconnect"}, function(response) {
      if (chrome.runtime.lastError) {
        statusDiv.textContent = "Status: Error disconnecting";
        statusDiv.className = "status connected";
        disconnectBtn.disabled = false;
        return;
      }
      
      statusDiv.textContent = "Status: Disconnected";
      statusDiv.className = "status disconnected";
      updateButtons(false);
    });
  });
  
  function loadServers() {
    chrome.runtime.sendMessage({action: "getServers"}, function(response) {
      if (chrome.runtime.lastError) {
        console.error("Error loading servers:", chrome.runtime.lastError);
        return;
      }
      
      // Clear existing options
      serverSelect.innerHTML = '';
      
      // Add server options
      response.servers.forEach(server => {
        const option = document.createElement('option');
        option.value = server.id;
        option.textContent = server.name;
        serverSelect.appendChild(option);
      });
      
      // Set current selected server
      serverSelect.value = response.currentServerId;
    });
  }
  
  function checkStatus() {
    chrome.runtime.sendMessage({action: "getStatus"}, function(response) {
      if (chrome.runtime.lastError) {
        statusDiv.textContent = "Status: Error connecting to background";
        statusDiv.className = "status disconnected";
        return;
      }
      
      const isConnected = response.status === "connected";
      statusDiv.textContent = "Status: " + (isConnected ? "Connected" : "Disconnected");
      statusDiv.className = isConnected ? "status connected" : "status disconnected";
      
      if (response.server) {
        updateServerInfo(response.server);
      }
      
      updateButtons(isConnected);
    });
  }
  
  function updateServerInfo(server) {
    serverInfo.textContent = `Server: ${server.name}`;
  }
  
  function updateButtons(isConnected) {
    connectBtn.disabled = isConnected;
    disconnectBtn.disabled = !isConnected;
    serverSelect.disabled = isConnected; 
  }
});