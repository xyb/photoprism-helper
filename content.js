// content.js - PhotoPrism Helper Content Script

const DEFAULT_CONFIG = {
    allowedDomains: [
        'https://demo.photoprism.app'
    ]
};

async function isPluginEnabled() {
    try {
        const result = await chrome.storage.local.get('pluginConfig');
        const config = result.pluginConfig || DEFAULT_CONFIG;
        
        const currentUrl = window.location.href;
        const allowedDomains = config.allowedDomains || [];
        
        return isUrlAllowed(currentUrl, allowedDomains);
    } catch (error) {
        console.error('Error checking plugin configuration:', error);
        return false;
    }
}

function isUrlAllowed(url, allowedDomains) {
    if (!allowedDomains || allowedDomains.length === 0) {
        return false;
    }
    
    try {
        const urlObj = new URL(url);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
        
        return allowedDomains.some(domain => {
            if (domain === baseUrl) {
                return true;
            }
            
            if (domain.includes('*')) {
                const pattern = domain.replace(/\*/g, '.*');
                const regex = new RegExp(`^${pattern}$`);
                return regex.test(baseUrl);
            }
            
            return false;
        });
    } catch {
        return false;
    }
}

console.log('PhotoPrism Helper content script loaded on:', window.location.href);

isPluginEnabled().then(enabled => {
    if (enabled) {
        console.log('PhotoPrism Helper enabled for this page');
        setupMessageListener();
    } else {
        console.log('PhotoPrism Helper disabled for this page');
    }
});

function setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Content script received message:', request);
        
        if (request.action === "getPhotoPrismData") {
            handleGetPhotoPrismData(request, sender, sendResponse);
            return true;
        }
        
        if (request.action === "updateConfig") {
            console.log('Configuration updated, re-evaluating page enablement');
            isPluginEnabled().then(enabled => {
                if (enabled) {
                    console.log('Plugin remains enabled after config update');
                } else {
                    console.log('Plugin disabled after config update');
                }
            });
            sendResponse({ success: true });
        }
    });
}

async function handleGetPhotoPrismData(request, sender, sendResponse) {
    const enabled = await isPluginEnabled();
    if (!enabled) {
        sendResponse({
            success: false,
            error: "Plugin is disabled for this page"
        });
        return;
    }
    
    try {
        const uids = JSON.parse(localStorage.getItem('clipboard.photos') || '[]');
        const token = localStorage.getItem('session.token');
        
        console.log('Found UIDs:', uids);
        console.log('Token found:', !!token);

        if (token) {
            sendResponse({
                success: true,
                data: {
                    uids: uids,
                    token: token
                }
            });
        } else {
            sendResponse({
                success: false,
                error: "Authentication token not found. Please log in to PhotoPrism."
            });
        }
    } catch (e) {
        console.error('Error reading localStorage:', e);
        sendResponse({
            success: false,
            error: "Failed to read data from localStorage. Error: " + e.message
        });
    }
}
