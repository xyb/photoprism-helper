/**
 * Minimal storage utilities for instance-specific data isolation
 * No migration, no backward compatibility - clean slate implementation
 */

/**
 * Gets the current PhotoPrism instance identifier
 * @returns {Promise<string>} Instance identifier
 */
async function getCurrentInstanceId() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0] || !tabs[0].url) {
                reject(new Error("Could not determine current instance"));
                return;
            }
            
            try {
                const url = new URL(tabs[0].url);
                const instanceId = `${url.protocol}//${url.host}`;
                resolve(instanceId);
            } catch (error) {
                reject(new Error("Invalid URL format"));
            }
        });
    });
}

/**
 * Creates instance-specific storage key
 * @param {string} baseKey - Base storage key
 * @param {string} instanceId - Instance identifier
 * @returns {string} Instance-specific key
 */
function createInstanceKey(baseKey, instanceId) {
    const sanitized = instanceId.replace(/[^a-zA-Z0-9]/g, '_');
    return `${baseKey}_${sanitized}`;
}

/**
 * Gets instance-specific data
 * @param {string} baseKey - Base storage key
 * @param {*} defaultValue - Default if not found
 * @returns {Promise<*>} Data for current instance
 */
async function getInstanceData(baseKey, defaultValue = null) {
    try {
        const instanceId = await getCurrentInstanceId();
        const key = createInstanceKey(baseKey, instanceId);
        const result = await chrome.storage.local.get(key);
        return result[key] || defaultValue;
    } catch (error) {
        console.error('Error getting instance data:', error);
        return defaultValue;
    }
}

/**
 * Sets instance-specific data
 * @param {string} baseKey - Base storage key
 * @param {*} value - Value to store
 * @returns {Promise<void>}
 */
async function setInstanceData(baseKey, value) {
    try {
        const instanceId = await getCurrentInstanceId();
        const key = createInstanceKey(baseKey, instanceId);
        await chrome.storage.local.set({ [key]: value });
    } catch (error) {
        console.error('Error setting instance data:', error);
        throw error;
    }
}