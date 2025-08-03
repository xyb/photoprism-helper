// popup.js

// --- Debug Logging System ---
class DebugLogger {
    constructor() {
        this.debugPanel = null;
        this.debugMessages = null;
        this.isVisible = false;
        this.logs = [];
        this.maxLogs = 100;
        
        // Override console methods
        this.overrideConsole();
    }
    
    async initialize() {
        this.debugPanel = document.getElementById('debug-panel');
        this.debugMessages = document.getElementById('debug-messages');
        
        // Add event listeners for debug controls
        const toggleBtn = document.getElementById('debug-toggle');
        const clearBtn = document.getElementById('debug-clear');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleDebugPanel());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearLogs());
        }
        
        // Check debug settings from config
        await this.checkDebugSettings();
        
        this.log('Debug system initialized', 'info');
    }
    
    async checkDebugSettings() {
        try {
            const result = await chrome.storage.local.get('pluginConfig');
            const config = result.pluginConfig || {};
            
            const debugContainer = document.getElementById('debug-container');
            
            if (config.debugEnabled) {
                // Show debug container if debug is enabled
                this.isVisible = true;
                if (debugContainer) {
                    debugContainer.style.display = 'block';
                }
                
                if (this.debugPanel) {
                    this.debugPanel.style.display = 'block';
                }
                
                const toggleBtn = document.getElementById('debug-toggle');
                if (toggleBtn) {
                    toggleBtn.textContent = 'Hide';
                }
                
                this.log('Debug mode enabled from settings', 'info');
            } else {
                // Hide entire debug container when disabled
                this.isVisible = false;
                if (debugContainer) {
                    debugContainer.style.display = 'none';
                }
                
                const toggleBtn = document.getElementById('debug-toggle');
                if (toggleBtn) {
                    toggleBtn.textContent = 'Show';
                }
            }
        } catch (error) {
            console.error('Error checking debug settings:', error);
        }
    }
    
    overrideConsole() {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        const originalInfo = console.info;
        const originalDebug = console.debug;
        
        console.log = (...args) => {
            this.log(args.join(' '), 'log');
            originalLog.apply(console, args);
        };
        
        console.error = (...args) => {
            this.log(args.join(' '), 'error');
            originalError.apply(console, args);
        };
        
        console.warn = (...args) => {
            this.log(args.join(' '), 'warn');
            originalWarn.apply(console, args);
        };
        
        console.info = (...args) => {
            this.log(args.join(' '), 'info');
            originalInfo.apply(console, args);
        };
        
        console.debug = (...args) => {
            this.log(args.join(' '), 'debug');
            originalDebug.apply(console, args);
        };
    }
    
    log(message, type = 'log') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            message: String(message),
            type: type,
            timestamp: timestamp
        };
        
        this.logs.push(logEntry);
        
        // Keep only the last N logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        this.displayLog(logEntry);
    }
    
    displayLog(logEntry) {
        if (!this.debugMessages) return;
        
        const logElement = document.createElement('div');
        logElement.className = `debug-${logEntry.type}`;
        logElement.textContent = `[${logEntry.timestamp}] ${logEntry.message}`;
        
        // Insert new log at the top instead of bottom
        this.debugMessages.insertBefore(logElement, this.debugMessages.firstChild);
        
        // Keep scroll at top for newest messages
        this.debugMessages.scrollTop = 0;
    }
    
    toggleDebugPanel() {
        if (!this.debugPanel) return;
        
        this.isVisible = !this.isVisible;
        this.debugPanel.style.display = this.isVisible ? 'block' : 'none';
        
        const toggleBtn = document.getElementById('debug-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = this.isVisible ? 'Hide' : 'Show';
        }
    }
    
    clearLogs() {
        this.logs = [];
        if (this.debugMessages) {
            this.debugMessages.innerHTML = '';
        }
        this.log('Debug logs cleared', 'info');
    }
    
    // Utility methods for common log types
    logInfo(message) {
        this.log(message, 'info');
    }
    
    logError(message) {
        this.log(message, 'error');
    }
    
    logWarn(message) {
        this.log(message, 'warn');
    }
    
    logDebug(message) {
        this.log(message, 'debug');
    }
}

// Create global debug logger
const debugLogger = new DebugLogger();

// --- DOM Elements ---
const labelInput = document.getElementById('label-input');
const addBtn = document.getElementById('add-btn');
const removeBtn = document.getElementById('remove-btn');
const statusDiv = document.getElementById('status');
const labelList = document.getElementById('label-list');
const recentLabelsContainer = document.getElementById('recent-labels');
const noRecentSpan = document.getElementById('no-recent');

// Progress Bar Elements
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');


// --- Event Listeners ---
addBtn.addEventListener('click', () => handleAction('add'));
removeBtn.addEventListener('click', () => handleAction('remove'));

// Configuration button
const configBtn = document.getElementById('config-btn');
configBtn.addEventListener('click', openConfiguration);

// Initialize recent labels on page load
document.addEventListener('DOMContentLoaded', () => {
    debugLogger.initialize();
    debugLogger.logInfo('DOMContentLoaded: Initializing PhotoPrism Helper');
    
    loadRecentLabels();
    // Async load history and failed operations
    setTimeout(() => {
        debugLogger.logInfo('Loading execution history and failed operations');
        refreshExecutionHistory();
        refreshFailedOperations();
    }, 100);
});



// --- UI State Management ---

/**
 * Toggles the UI elements to a disabled state during an operation.
 * @param {boolean} isProcessing - Whether an operation is in progress.
 */
function setUIProcessingState(isProcessing) {
    labelInput.disabled = isProcessing;
    addBtn.disabled = isProcessing;
    removeBtn.disabled = isProcessing;
    progressContainer.style.display = isProcessing ? 'block' : 'none';
}

/**
 * Updates the progress bar and text.
 * @param {number} processed - The number of items processed.
 * @param {number} total - The total number of items.
 */
function updateProgress(processed, total) {
    const percentage = total > 0 ? (processed / total) * 100 : 0;
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${processed} / ${total}`;
}

/**
 * Displays a message in the status area.
 * @param {string} message - The message to display.
 * @param {boolean} isError - If true, formats the message as an error.
 */
function setStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? '#dc3545' : 'black';
}


// --- Core Logic ---

/**
 * Main handler for both "add" and "remove" actions.
 * @param {'add' | 'remove'} action - The action to perform.
 */
async function handleAction(action) {
    debugLogger.logInfo('=== PhotoPrism Helper Debug ===');
    debugLogger.logInfo(`Action: ${action}`);
    const labelName = labelInput.value.trim();
    if (!labelName) {
        setStatus('Please enter a label name.', true);
        return;
    }

    setUIProcessingState(true);
    setStatus(`Requesting data from PhotoPrism...`);
    updateProgress(0, 0);

    // Start timing
    const startTime = Date.now();
    let executionResult = {
        action: action,
        labelName: labelName,
        totalCount: 0,
        successCount: 0,
        failedCount: 0,
        failedUids: [],
        startTime: new Date().toISOString(),
        duration: 0,
        error: null
    };

    try {
        const { uids, token } = await getPhotoPrismData();

        if (!uids || uids.length === 0) {
            throw new Error("No photos selected. Please select photos in PhotoPrism first.");
        }

        executionResult.totalCount = uids.length;
        setStatus(`Processing ${uids.length} photos...`);

        let result;
        if (action === 'add') {
            result = await batchProcess(uids, (uid) => addLabel(uid, labelName, token));
        } else if (action === 'remove') {
            const labelId = await getLabelId(labelName, uids[0], token);
            result = await batchProcess(uids, (uid) => removeLabel(uid, labelId, token));
        }
        executionResult.successCount = result.successCount;
        executionResult.failedCount = result.failedCount;
        executionResult.failedUids = result.failedUids;


        // Save execution result (will auto-refresh history UI)
        executionResult.duration = Date.now() - startTime;
        await saveExecutionResult(executionResult);

        // Save failed operations (will auto-refresh failed operations UI)
        if (executionResult.failedUids.length > 0) {
            await saveFailedOperation({
                action: action,
                labelName: labelName,
                failedUids: executionResult.failedUids,
                timestamp: new Date().toISOString(),
                retryCount: 0
            });
        } else {
            await removeFailedOperation(action, labelName.toLowerCase());
        }

        // Update recent labels (will auto-refresh labels UI)
        await addToRecentLabels(labelName);

        // Finally, update final status message after all data is saved and UI refreshed
        let finalMessage = `Operation complete. Success: ${executionResult.successCount}`;
        if (executionResult.failedCount > 0) {
            finalMessage += `, Failed: ${executionResult.failedCount}. Click 'Retry Failed' to retry.`;
        } else {
            finalMessage += `.`;
        }
        setStatus(finalMessage, executionResult.failedCount > 0);
        
    } catch (error) {
        executionResult.error = error.message;
        executionResult.duration = Date.now() - startTime;
        await saveExecutionResult(executionResult); // Save error result
        setStatus(error.message, true);
        // Failed operations list may also need refresh, just in case
        await refreshFailedOperations();
    } finally {
        setUIProcessingState(false);
    }
}

/**
 * Processes an array of UIDs with a given API function, updating progress along the way.
 * @param {string[]} uids - Array of photo UIDs.
 * @param {function(string): Promise<any>} apiFn - The API function to call for each UID.
 * @returns {Promise<{successCount: number, failedCount: number, failedUids: string[]}>} - Object with success, failed counts and failed UIDs
 */
async function batchProcess(uids, apiFn) {
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    const failedUids = [];
    const total = uids.length;

    debugLogger.logInfo(`Starting batch process for ${total} photos`);
    updateProgress(processedCount, total);

    const promises = uids.map(uid =>
        apiFn(uid)
            .then(res => {
                debugLogger.logDebug(`Success for UID: ${uid}`);
                successCount++;
                return { status: 'fulfilled', value: res, uid };
            })
            .catch(err => {
                debugLogger.logError(`Failed for UID: ${uid}, Error: ${err.message}`);
                failedCount++;
                failedUids.push(uid);
                return { status: 'rejected', reason: err, uid };
            })
            .finally(() => {
                processedCount++;
                updateProgress(processedCount, total);
            })
    );

    await Promise.all(promises);

    debugLogger.logInfo(`Batch process finished. Success: ${successCount}, Failed: ${failedCount}`);
    
    return { successCount, failedCount, failedUids };
}


// --- API Interaction ---

/**
 * Gets UIDs and token from the content script.
 * @returns {Promise<{uids: string[], token: string}>}
 */
function getPhotoPrismData() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            debugLogger.logInfo(`Active tabs found: ${JSON.stringify(tabs)}`);
            if (!tabs[0]) {
                return reject(new Error("Could not find active tab."));
            }
            debugLogger.logInfo(`Sending message to tab: ${tabs[0].id}, ${tabs[0].url}`);
            chrome.tabs.sendMessage(tabs[0].id, { action: "getPhotoPrismData" }, (response) => {
                debugLogger.logInfo(`Received response: ${JSON.stringify(response)}`);
                debugLogger.logInfo(`Chrome runtime lastError: ${JSON.stringify(chrome.runtime.lastError)}`);
                
                if (chrome.runtime.lastError) {
                    const errorMessage = chrome.runtime.lastError.message || 'Unknown error';
                    debugLogger.logError(`Full error object: ${JSON.stringify(chrome.runtime.lastError)}`);
                    
                    let enhancedMessage = `Could not communicate with PhotoPrism page. `;
                    
                    if (errorMessage.includes("Receiving end does not exist")) {
                        enhancedMessage += `This usually means:\n\n` +
                            `1. You're not on a PhotoPrism page - please navigate to your PhotoPrism instance\n` +
                            `2. This PhotoPrism instance hasn't been added to the extension - please:\n` +
                            `   • Click the settings button below\n` +
                            `   • Add your PhotoPrism URL to the allowed instances\n` +
                            `   • Refresh the PhotoPrism page and try again\n\n` +
                            `Error: ${errorMessage}`;
                    } else if (errorMessage.includes("Could not establish connection")) {
                        enhancedMessage += `This might be a permission issue. Please:\n\n` +
                            `1. Ensure you're on a PhotoPrism page\n` +
                            `2. Check if the extension has permission for this site\n` +
                            `3. Add this URL to allowed instances in settings\n` +
                            `4. Refresh the page and try again\n\n` +
                            `Error: ${errorMessage}`;
                    } else {
                        enhancedMessage += `Please ensure you are on a PhotoPrism page and refresh if needed. Error: ${errorMessage}`;
                    }
                    
                    return reject(new Error(enhancedMessage));
                }
                if (response && response.success) {
                    resolve(response.data);
                } else {
                    const errorMsg = response.error || "An unknown error occurred.";
                    
                    if (errorMsg.includes("not authorized") || errorMsg.includes("permission")) {
                        reject(new Error(`Authorization error. Please check:\n\n` +
                            `1. You're logged into PhotoPrism\n` +
                            `2. Your session hasn't expired\n` +
                            `3. The extension has permission for this site\n` +
                            `4. This PhotoPrism instance is added to extension settings\n\n` +
                            `Details: ${errorMsg}`));
                    } else {
                        reject(new Error(errorMsg));
                    }
                }
            });
        });
    });
}

/**
 * Adds a label to a single photo.
 * @param {string} uid - Photo UID.
 * @param {string} labelName - The name of the label to add.
 * @param {string} token - Auth token.
 */
async function addLabel(uid, labelName, token) {
    // Get current page full URL
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = new URL(tabs[0].url);
    const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;
    const url = `${baseUrl}/api/v1/photos/${uid}/label`;
    
    try {
        setStatus(`Calling API: ${url}`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': token,
            },
            body: JSON.stringify({ Name: labelName, Priority: 0 }),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        return response.json();
    } catch (error) {
        throw new Error(`Failed to add label to ${url}: ${error.message}`);
    }
}

/**
 * Removes a label from a single photo.
 * @param {string} uid - Photo UID.
 * @param {number} labelId - The ID of the label to remove.
 * @param {string} token - Auth token.
 */
async function removeLabel(uid, labelId, token) {
    // Get current page full URL
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = new URL(tabs[0].url);
    const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;
    const url = `${baseUrl}/api/v1/photos/${uid}/label/${labelId}`;
    
    try {
        setStatus(`Calling API: ${url}`);
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'X-Auth-Token': token,
            },
        });
        
        if (!response.ok && response.status !== 404) { // Ignore 404 (label not on photo)
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        return response.json();
    } catch (error) {
        throw new Error(`Failed to remove label: ${error.message}`);
    }
}



// --- Label ID Cache Logic ---

/**
 * Gets a label's ID, using a cache first.
 * @param {string} labelName - The name of the label.
 * @param {string} firstUid - The UID of the first photo to check if cache misses.
 * @param {string} token - Auth token.
 * @returns {Promise<number>}
 */
async function getLabelId(labelName, firstUid, token) {
    const labelCache = await getInstanceData('labelCache', {});

    if (labelCache[labelName]) {
        return labelCache[labelName];
    }

    // Cache miss, fetch from API
    setStatus('Cache miss, fetching label ID from API...');
    
    // Get current page full URL
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = new URL(tabs[0].url);
    const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;
    const url = `${baseUrl}/api/v1/photos/${firstUid}`;
    
    try {
        const response = await fetch(url, {
            headers: { 'X-Auth-Token': token }
        });
        if (!response.ok) throw new Error('Failed to fetch photo details for label ID.');

        const photoDetails = await response.json();
        const label = photoDetails.Labels?.find(l => 
            l.Label.Name.toLowerCase() === labelName.toLowerCase() || 
            l.Label.Slug.toLowerCase() === labelName.toLowerCase()
        );

        if (!label) {
            throw new Error(`Label "${labelName}" not found on the photo, cannot determine its ID.`);
        }

        const labelId = label.Label.ID;
        labelCache[labelName] = labelId;
        await setInstanceData('labelCache', labelCache);

        return labelId;
    } catch (error) {
        throw new Error(`Failed to get label ID: ${error.message}`);
    }
}

/**
 * Opens the configuration page in a new tab
 */
function openConfiguration() {
    chrome.tabs.create({ url: chrome.runtime.getURL('config.html') });
}

/**
 * Clears the label ID cache and recent labels.
 */
async function clearLabelCache() {
    await chrome.storage.local.remove([
        createInstanceKey('labelCache', await getCurrentInstanceId()),
        createInstanceKey('recentLabels', await getCurrentInstanceId()),
        createInstanceKey('allLabels', await getCurrentInstanceId()),
        createInstanceKey('executionHistory', await getCurrentInstanceId()),
        createInstanceKey('failedOperations', await getCurrentInstanceId())
    ]);
    labelInput.value = '';
    displayRecentLabels([]);
    updateLabelDatalist([]);
    displayExecutionHistory([]);
    displayFailedOperations([]);
    setStatus('All caches cleared.', false);
}

// --- Recent Labels Management ---


/**
 * Loads recent labels from storage and displays them
 */
async function loadRecentLabels() {
    const recentLabels = await getInstanceData('recentLabels', []);
    const allLabels = await getInstanceData('allLabels', []);
    
    // Set the most recent label as default in input
    if (recentLabels.length > 0) {
        labelInput.value = recentLabels[0];
    }
    
    // Display recent labels as clickable tags
    displayRecentLabels(recentLabels);
    
    // Update datalist with all labels for autocomplete
    updateLabelDatalist(allLabels);
}

/**
 * Displays recent labels as clickable tags
 * @param {string[]} labels - Array of recent label names
 */
function displayRecentLabels(labels) {
    if (labels.length === 0) {
        noRecentSpan.style.display = 'inline';
        return;
    }
    
    noRecentSpan.style.display = 'none';
    
    // Remove existing recent label tags
    const existingTags = recentLabelsContainer.querySelectorAll('.recent-label-tag');
    existingTags.forEach(tag => tag.remove());
    
    // Add new recent label tags
    labels.slice(0, 10).forEach(label => {
        const tag = document.createElement('span');
        tag.className = 'recent-label-tag';
        tag.textContent = label;
        tag.addEventListener('click', () => {
            labelInput.value = label;
            labelInput.focus();
        });
        recentLabelsContainer.appendChild(tag);
    });
}

/**
 * Updates the datalist with all labels for autocomplete
 * @param {string[]} labels - Array of all label names
 */
function updateLabelDatalist(labels) {
    labelList.innerHTML = '';
    labels.forEach(label => {
        const option = document.createElement('option');
        option.value = label;
        labelList.appendChild(option);
    });
}

/**
 * Adds a label to recent labels and all labels storage
 * @param {string} labelName - The label to add
 */
async function addToRecentLabels(labelName) {
    if (!labelName.trim()) return;
    
    // Normalize to lowercase for case-insensitive storage
    const normalizedLabel = labelName.trim().toLowerCase();
    
    let recentLabels = await getInstanceData('recentLabels', []);
    let allLabels = await getInstanceData('allLabels', []);
    
    // Remove from recent if already exists (case-insensitive) to avoid duplicates
    recentLabels = recentLabels.filter(label => label.toLowerCase() !== normalizedLabel);
    
    // Add to beginning of recent labels (most recent first)
    recentLabels.unshift(normalizedLabel);
    
    // Keep only the 20 most recent labels
    recentLabels = recentLabels.slice(0, 20);
    
    // Add to all labels if not already exists (case-insensitive)
    const existsInAll = allLabels.some(label => label.toLowerCase() === normalizedLabel);
    if (!existsInAll) {
        allLabels.push(normalizedLabel);
        allLabels.sort(); // Sort alphabetically
    }
    
    // Save to storage
    await setInstanceData('recentLabels', recentLabels);
    await setInstanceData('allLabels', allLabels);
    
    // Ensure UI is updated
    displayRecentLabels(recentLabels);
    updateLabelDatalist(allLabels);
}

/**
 * Refreshes all UI displays immediately after operations
 */
async function refreshAllDisplays() {
    // Add a small delay to ensure storage operations complete
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Refresh recent labels
    const recentLabels = await getInstanceData('recentLabels', []);
    const allLabels = await getInstanceData('allLabels', []);
    displayRecentLabels(recentLabels);
    updateLabelDatalist(allLabels);
    
    // Refresh execution history
    const executionHistory = await getInstanceData('executionHistory', []);
    displayExecutionHistory(executionHistory);
    
    // Refresh failed operations
    const failedOperations = await getInstanceData('failedOperations', []);
    displayFailedOperations(failedOperations);
}


/**
 * Removes a failed operation from storage
 * @param {string} action - The action type
 * @param {string} labelName - The label name
 */
async function removeFailedOperation(action, labelName) {
    let failedOperations = await getInstanceData('failedOperations', []);
    
    // Remove the failed operation for this label/action combination (case-insensitive)
    failedOperations = failedOperations.filter(
        op => !(op.labelName.toLowerCase() === labelName.toLowerCase() && op.action === action)
    );
    
    await setInstanceData('failedOperations', failedOperations);
    
    // Use independent async loading function to refresh latest data
    await refreshFailedOperations();
}

// --- Failed Operations Management ---

/**
 * Saves failed operations for retry functionality
 * @param {Object} failedOperation - The failed operation details
 */
async function saveFailedOperation(failedOperation) {
    let failedOperations = await getInstanceData('failedOperations', []);
    
    // Add or update the failed operation for this label/action combination
    const existingIndex = failedOperations.findIndex(
        op => op.labelName.toLowerCase() === failedOperation.labelName.toLowerCase() && op.action === failedOperation.action
    );
    
    if (existingIndex >= 0) {
        // Update existing failed operation
        failedOperations[existingIndex] = failedOperation;
    } else {
        // Add new failed operation
        failedOperations.unshift(failedOperation);
    }
    
    // Keep only the 20 most recent failed operations
    failedOperations = failedOperations.slice(0, 20);
    
    await setInstanceData('failedOperations', failedOperations);
    
    // Use independent async loading function to refresh latest data
    await refreshFailedOperations();
}

/**
 * Loads failed operations from storage and displays them
 */
async function loadFailedOperations() {
    const failedOperations = await getInstanceData('failedOperations', []);
    displayFailedOperations(failedOperations);
}

/**
 * Displays failed operations in the UI with retry buttons
 * @param {Array} failedOperations - Array of failed operations
 */
function displayFailedOperations(failedOperations) {
    const failedContainer = document.getElementById('failed-operations');
    const noFailedSpan = document.getElementById('no-failed');
    
    if (!failedContainer || !noFailedSpan) return;
    
    if (failedOperations.length === 0) {
        noFailedSpan.style.display = 'inline';
        failedContainer.innerHTML = '<div style="font-weight: bold; margin-bottom: 5px; font-size: 12px; color: #dc3545;">Failed Operations:</div>';
        return;
    }
    
    noFailedSpan.style.display = 'none';
    
    // Clear existing content except the header
    failedContainer.innerHTML = '<div style="font-weight: bold; margin-bottom: 5px; font-size: 12px; color: #dc3545;">Failed Operations:</div>';
    
    // Add failed operation items
    failedOperations.forEach((operation, index) => {
        const failedItem = document.createElement('div');
        failedItem.style.cssText = 'font-size: 11px; margin-bottom: 5px; padding: 4px; border: 1px solid #ffcdd2; border-radius: 3px; background-color: #ffebee;';
        
        const actionText = operation.action === 'add' ? 'Add' : 'Remove';
        const actionColor = operation.action === 'add' ? '#28a745' : '#dc3545';
        const date = new Date(operation.timestamp);
        const dateStr = date.toLocaleDateString();
        
        failedItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>
                    <span style="color: ${actionColor}; font-weight: bold;">${actionText}</span>
                    <span style="color: #666;">"${operation.labelName}"</span>
                    <span style="color: #dc3545;">${operation.failedUids.length} failed</span>
                </span>
                <button class="retry-btn" data-index="${index}" 
                        style="font-size: 10px; padding: 2px 6px; background: #dc3545; color: white; border: none; 
                               border-radius: 3px; cursor: pointer;">Retry</button>
            </div>
            <div style="font-size: 10px; color: #666; margin-top: 2px;">${dateStr} - ${operation.failedUids.length} photos need retry</div>
        `;
        
        failedContainer.appendChild(failedItem);
    });
    
    // Add event listeners for retry buttons
    document.querySelectorAll('.retry-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            retryFailedOperation(index);
        });
    });
}

/**
 * Retries a failed operation
 * @param {number} index - Index of the failed operation in storage
 */
async function retryFailedOperation(index) {
    const failedOperations = await getInstanceData('failedOperations', []);
    
    if (index >= failedOperations.length) return;
    
    const operation = failedOperations[index];
    const labelName = operation.labelName;
    const failedUids = operation.failedUids;
    const action = operation.action;
    
    if (failedUids.length === 0) return;
    
    setUIProcessingState(true);
    setStatus(`Retrying ${failedUids.length} failed photos...`);
    updateProgress(0, failedUids.length);
    
    // Start timing
    const startTime = Date.now();
    let retryResult = {
        action: action,
        labelName: labelName,
        totalCount: failedUids.length,
        successCount: 0,
        failedCount: 0,
        failedUids: [],
        startTime: new Date().toISOString(),
        duration: 0,
        error: null,
        isRetry: true
    };
    
    try {
        const { token } = await getPhotoPrismData();
        
        if (action === 'add') {
            const result = await batchProcess(failedUids, (uid) => addLabel(uid, labelName, token));
            retryResult.successCount = result.successCount;
            retryResult.failedCount = result.failedCount;
            retryResult.failedUids = result.failedUids;
        } else if (action === 'remove') {
            const labelId = await getLabelId(labelName, failedUids[0], token);
            const result = await batchProcess(failedUids, (uid) => removeLabel(uid, labelId, token));
            retryResult.successCount = result.successCount;
            retryResult.failedCount = result.failedCount;
            retryResult.failedUids = result.failedUids;
        }
        
        // Update the failed operation with new results
        if (retryResult.failedUids.length === 0) {
            // All succeeded, remove from failed operations
            failedOperations.splice(index, 1);
            await setInstanceData('failedOperations', failedOperations);
        } else {
            // Still have failures, update the failed UIDs
            failedOperations[index].failedUids = retryResult.failedUids;
            failedOperations[index].retryCount = (failedOperations[index].retryCount || 0) + 1;
            failedOperations[index].timestamp = new Date().toISOString();
            await setInstanceData('failedOperations', failedOperations);
        }
        
        // Force immediate refresh with latest data
        await forceRefreshAllDisplays();
        
    } catch (error) {
        retryResult.error = error.message;
        setStatus(error.message, true);
    } finally {
        retryResult.duration = Date.now() - startTime;
        await saveExecutionResult(retryResult);
        await refreshExecutionHistory();
        await refreshFailedOperations();
        setUIProcessingState(false);
    }
}

// --- Execution History Management ---

/**
 * Saves an execution result to history
 * @param {Object} executionResult - The execution result to save
 */
async function saveExecutionResult(executionResult) {
    const resultWithId = {
        ...executionResult,
        id: Date.now().toString()
    };
    
    let executionHistory = await getInstanceData('executionHistory', []);
    
    // Add to beginning of history (most recent first)
    executionHistory.unshift(resultWithId);
    
    // Keep only the 50 most recent executions
    executionHistory = executionHistory.slice(0, 50);
    
    await setInstanceData('executionHistory', executionHistory);
    
    // 使用独立异步加载函数刷新最新数据
    await refreshExecutionHistory();
}

/**
 * Async refresh execution history
 */
async function refreshExecutionHistory() {
    try {
        const executionHistory = await getInstanceData('executionHistory', []);
        displayExecutionHistory(executionHistory);
    } catch (error) {
        debugLogger.logError(`Error loading execution history: ${error}`);
    }
}

/**
 * Async refresh failed operations
 */
async function refreshFailedOperations() {
    try {
        const failedOperations = await getInstanceData('failedOperations', []);
        displayFailedOperations(failedOperations);
    } catch (error) {
        debugLogger.logError(`Error loading failed operations: ${error}`);
    }
}

// Maintain backward compatibility aliases
async function loadExecutionHistory() {
    return refreshExecutionHistory();
}

async function loadFailedOperations() {
    return refreshFailedOperations();
}

/**
 * Displays execution history in the UI
 * @param {Array} history - Array of execution results
 */
function displayExecutionHistory(history) {
    const historyContainer = document.getElementById('execution-history');
    const noHistorySpan = document.getElementById('no-history');
    debugLogger.logInfo('=== display history ===');
    
    if (!historyContainer || !noHistorySpan) return;
    
    if (history.length === 0) {
        noHistorySpan.style.display = 'inline';
        historyContainer.innerHTML = '<div style="font-weight: bold; margin-bottom: 5px; font-size: 12px;">Recent Executions:</div>';
        return;
    }
    
    noHistorySpan.style.display = 'none';
    
    // Clear existing content except the header
    historyContainer.innerHTML = '<div style="font-weight: bold; margin-bottom: 5px; font-size: 12px;">Recent Executions:</div>';
    
    // Add history items
    history.slice(0, 5).forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.style.cssText = 'font-size: 11px; margin-bottom: 3px; padding: 2px; border-left: 2px solid #ccc; padding-left: 5px;';
        
        const actionText = item.action === 'add' ? 'Add' : 'Remove';
        const actionColor = item.action === 'add' ? '#28a745' : '#dc3545';
        const date = new Date(item.startTime);
        const dateStr = date.toLocaleTimeString();
        const durationSeconds = (item.duration / 1000).toFixed(1);
        
        historyItem.innerHTML = `
            <span style="color: ${actionColor}; font-weight: bold;">${actionText}</span>
            <span style="color: #666;">"${item.labelName}"</span>
            <span style="color: #333;">${item.successCount}/${item.totalCount} ✓</span>
            ${item.failedCount > 0 ? `<span style="color: #dc3545;">${item.failedCount} ✗</span>` : ''}
            <span style="color: #999; font-size: 10px;">${dateStr} (${durationSeconds}s)</span>
        `;
        
        historyContainer.appendChild(historyItem);
    });
}
