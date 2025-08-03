// config.js - Domain-based configuration for PhotoPrism instances

// Default configuration with demo PhotoPrism
const DEFAULT_CONFIG = {
    allowedDomains: [
        'https://demo.photoprism.app'
    ],
    debugEnabled: false,
    version: '1.0.0'
};

/**
 * Load current configuration when page loads
 */
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfiguration();
    await loadDebugSettings();
    
    console.log('Config page loaded, setting up event listeners');
    
    // Set up event listeners
    const addBtn = document.getElementById('add-domain-btn');
    const debugCheckbox = document.getElementById('debug-enabled');
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    
    if (addBtn) addBtn.addEventListener('click', addDomain);
    if (debugCheckbox) debugCheckbox.addEventListener('change', saveDebugSettings);
    if (clearCacheBtn) clearCacheBtn.addEventListener('click', clearAllCache);
    
    // New clear cache buttons
    const clearLabelCacheBtn = document.getElementById('clear-label-cache-btn');
    const clearRecentLabelsBtn = document.getElementById('clear-recent-labels-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const clearFailedBtn = document.getElementById('clear-failed-btn');
    
    if (clearLabelCacheBtn) clearLabelCacheBtn.addEventListener('click', clearLabelCache);
    if (clearRecentLabelsBtn) clearRecentLabelsBtn.addEventListener('click', clearRecentLabels);
    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearExecutionHistory);
    if (clearFailedBtn) clearFailedBtn.addEventListener('click', clearFailedOperations);
    
    // Allow Enter key to add domain
    const newDomainInput = document.getElementById('new-domain');
    if (newDomainInput) {
        newDomainInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addDomain();
            }
        });
    }
    
    // Test Chrome API availability
    if (typeof chrome !== 'undefined' && chrome.storage) {
        console.log('Chrome API available');
    } else {
        console.error('Chrome API not available');
        showStatus('Extension API not available', true);
    }
});

/**
 * Load and display the current domain configuration
 */
async function loadConfiguration() {
    try {
        const result = await chrome.storage.local.get('pluginConfig');
        const config = result.pluginConfig || DEFAULT_CONFIG;
        
        // Display the domains
        displayDomains(config.allowedDomains || []);
        
        showStatus('Configuration loaded successfully', false);
    } catch (error) {
        console.error('Error loading configuration:', error);
        showStatus('Error loading configuration', true);
    }
}

/**
 * Display the list of configured domains
 * @param {string[]} domains - Array of domain URLs
 */
function displayDomains(domains) {
    const domainList = document.getElementById('domain-list');
    const emptyState = document.getElementById('empty-domains');
    
    // Clear existing domains
    domainList.innerHTML = '';
    
    if (domains.length === 0) {
        domainList.appendChild(emptyState);
        return;
    }
    
    domains.forEach((domain, index) => {
        const domainItem = document.createElement('div');
        domainItem.className = 'domain-item';
        domainItem.innerHTML = `
            <span class="domain-url">${domain}</span>
            <button class="remove-btn" data-index="${index}">Remove</button>
        `;
        
        // Add event listener for remove button
        const removeBtn = domainItem.querySelector('.remove-btn');
        removeBtn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            removeDomain(index);
        });
        
        domainList.appendChild(domainItem);
    });
}

/**
 * Add a new domain to the configuration
 */
function addDomain() {
    const input = document.getElementById('new-domain');
    const url = input.value.trim();
    
    console.log('Adding domain:', url);
    
    if (!url) {
        showValidation('Please enter a domain URL');
        return;
    }
    
    // Basic URL validation
    if (!isValidUrl(url)) {
        showValidation('Please enter a valid URL (e.g., https://demo.photoprism.app)');
        return;
    }
    
    // Normalize URL
    const normalizedUrl = normalizeUrl(url);
    console.log('Normalized URL:', normalizedUrl);
    
    // Get current domains from storage
    chrome.storage.local.get('pluginConfig', (result) => {
        if (chrome.runtime.lastError) {
            console.error('Chrome storage error:', chrome.runtime.lastError);
            showStatus('Error saving configuration', true);
            return;
        }
        
        const config = result.pluginConfig || DEFAULT_CONFIG;
        const domains = config.allowedDomains || [];
        
        // Check for duplicates
        if (domains.includes(normalizedUrl)) {
            showValidation('This domain is already configured');
            return;
        }
        
        // Add new domain
        domains.push(normalizedUrl);
        const newConfig = { ...config, allowedDomains: domains };
        
        chrome.storage.local.set({ pluginConfig: newConfig }, () => {
            console.log('Saved new config:', newConfig);
            displayDomains(domains);
            input.value = '';
            hideValidation();
            showStatus('Instance added successfully', false);
            
            // Update content scripts
            updateContentScripts(newConfig);
        });
    });
}

/**
 * Remove a domain from the configuration
 * @param {number} index - Index of the domain to remove
 */
function removeDomain(index) {
    chrome.storage.local.get('pluginConfig', (result) => {
        if (chrome.runtime.lastError) {
            console.error('Chrome storage error:', chrome.runtime.lastError);
            showStatus('Error removing instance', true);
            return;
        }
        
        const config = result.pluginConfig || DEFAULT_CONFIG;
        const domains = [...(config.allowedDomains || [])];
        
        if (index >= 0 && index < domains.length) {
            const removedDomain = domains.splice(index, 1)[0];
            const newConfig = { ...config, allowedDomains: domains };
            
            chrome.storage.local.set({ pluginConfig: newConfig }, () => {
                displayDomains(domains);
                showStatus(`Removed ${removedDomain}`, false);
                
                // Update content scripts
                updateContentScripts(newConfig);
            });
        }
    });
}

/**
 * Update content scripts with new configuration
 * @param {object} config - The new configuration
 */
function updateContentScripts(config) {
    // Send message to all tabs to update their configuration
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { 
                action: 'updateConfig', 
                config: config 
            }).catch(() => {
                // Ignore errors for tabs without content script
            });
        });
    });
}

/**
 * Validate if a URL is valid
 * @param {string} url - URL to validate
 * @returns {boolean} - Whether the URL is valid
 */
function isValidUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Normalize URL by removing trailing slashes and path
 * @param {string} url - URL to normalize
 * @returns {string} - Normalized URL
 */
function normalizeUrl(url) {
    try {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.host}`;
    } catch {
        return url;
    }
}

/**
 * Check if a URL matches any of the configured domains
 * @param {string} url - URL to check
 * @param {string[]} allowedDomains - Array of allowed domains
 * @returns {boolean} - Whether the URL is allowed
 */
function isUrlAllowed(url, allowedDomains) {
    if (!allowedDomains || allowedDomains.length === 0) {
        return false;
    }
    
    try {
        const urlObj = new URL(url);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
        
        return allowedDomains.some(domain => {
            // Handle exact matches
            if (domain === baseUrl) {
                return true;
            }
            
            // Handle wildcard patterns (e.g., https://*.example.com)
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

/**
 * Show validation message
 * @param {string} message - The message to display
 */
function showValidation(message) {
    const validation = document.getElementById('domain-validation');
    validation.textContent = message;
    validation.style.display = 'block';
}

/**
 * Hide validation message
 */
function hideValidation() {
    const validation = document.getElementById('domain-validation');
    validation.style.display = 'none';
}

/**
 * Show status message
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether this is an error message
 */
function showStatus(message, isError) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${isError ? 'error' : 'success'}`;
    statusDiv.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

/**
 * Load debug settings from storage
 */
async function loadDebugSettings() {
    try {
        const result = await chrome.storage.local.get('pluginConfig');
        const config = result.pluginConfig || DEFAULT_CONFIG;
        
        const debugCheckbox = document.getElementById('debug-enabled');
        if (debugCheckbox) {
            debugCheckbox.checked = config.debugEnabled || false;
        }
    } catch (error) {
        console.error('Error loading debug settings:', error);
    }
}

/**
 * Save debug settings to storage
 */
async function saveDebugSettings() {
    try {
        const debugCheckbox = document.getElementById('debug-enabled');
        const isEnabled = debugCheckbox ? debugCheckbox.checked : false;
        
        const result = await chrome.storage.local.get('pluginConfig');
        const config = result.pluginConfig || DEFAULT_CONFIG;
        
        config.debugEnabled = isEnabled;
        
        await chrome.storage.local.set({ pluginConfig: config });
        showStatus('Debug settings saved', false);
    } catch (error) {
        console.error('Error saving debug settings:', error);
        showStatus('Error saving debug settings', true);
    }
}

/**
 * Clear label ID cache
 */
async function clearLabelCache() {
    try {
        showStatus('Clearing label cache...', false);
        
        await chrome.storage.local.remove('labelCache');
        
        showStatus('Label cache cleared successfully', false);
    } catch (error) {
        console.error('Error clearing label cache:', error);
        showStatus('Error clearing label cache', true);
    }
}

/**
 * Clear recent labels
 */
async function clearRecentLabels() {
    try {
        showStatus('Clearing recent labels...', false);
        
        await chrome.storage.local.remove(['recentLabels', 'allLabels']);
        
        showStatus('Recent labels cleared successfully', false);
    } catch (error) {
        console.error('Error clearing recent labels:', error);
        showStatus('Error clearing recent labels', true);
    }
}

/**
 * Clear execution history
 */
async function clearExecutionHistory() {
    try {
        showStatus('Clearing execution history...', false);
        
        await chrome.storage.local.remove('executionHistory');
        
        showStatus('Execution history cleared successfully', false);
    } catch (error) {
        console.error('Error clearing execution history:', error);
        showStatus('Error clearing execution history', true);
    }
}

/**
 * Clear failed operations
 */
async function clearFailedOperations() {
    try {
        showStatus('Clearing failed operations...', false);
        
        await chrome.storage.local.remove('failedOperations');
        
        showStatus('Failed operations cleared successfully', false);
    } catch (error) {
        console.error('Error clearing failed operations:', error);
        showStatus('Error clearing failed operations', true);
    }
}

/**
 * Clear all cached data
 */
async function clearAllCache() {
    try {
        showStatus('Clearing cache...', false);
        
        // Clear all PhotoPrism Helper related storage
        await chrome.storage.local.remove([
            'labelCache', 
            'recentLabels', 
            'allLabels', 
            'executionHistory', 
            'failedOperations'
        ]);
        
        showStatus('All cache cleared successfully', false);
    } catch (error) {
        console.error('Error clearing cache:', error);
        showStatus('Error clearing cache', true);
    }
}

