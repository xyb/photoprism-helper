# PhotoPrism Helper

A Chrome browser extension designed to simplify batch adding and removing labels for selected photos in [PhotoPrism](https://photoprism.app/) web interface.

## Features

**Batch Label Management**: Quickly add or remove labels from multiple selected photos at once
**Multi-Instance Support**: Configure and manage multiple PhotoPrism instances simultaneously
**Data Isolation**: Instance-specific storage keeps labels, history, and cache separate per instance
**Retry Operations**: Automatically retry failed label operations on specific photos
**Execution History**: Track all operations with detailed success/failure counts
**User-Friendly Interface**: Simple popup design for quick label operations

## Installation

This extension is not yet available on the Chrome Web Store, so you'll need to load it manually:

1. Download or clone this project to your local machine
2. Open Chrome browser and navigate to `chrome://extensions`
3. Enable **"Developer mode"** in the top right corner
4. Click **"Load unpacked"** button
5. Select the project root directory in the file picker

## Usage

1. **Configuration**:
   * Click the extension icon in Chrome toolbar
   * Click "Configure" to open the settings page
   * Add your PhotoPrism instance URL (e.g., `https://photoprism.example.com` or `http://192.168.1.100:2342`)
   * Save the configuration

2. **Operation**:
   * Log in to your PhotoPrism instance
   * Select one or more photos in albums or search results
   * Click the PhotoPrism icon in the browser toolbar
   * Enter or select the label name you want to operate on
   * Click "Add" or "Remove" button
   * The extension will perform the operation on all selected photos

## Requirements

- Chrome browser (Manifest V3 compatible)
- Access to a PhotoPrism instance
- Active PhotoPrism session (logged in)

## Security

This extension only interacts with your configured PhotoPrism instance and does not collect or transmit any personal data. All operations are performed directly between your browser and your PhotoPrism server.

## Development

### Project Structure
```
.
├── icons/                 # Extension icons (16x16, 48x48, 128x128)
├── content.js            # Content script for PhotoPrism page interaction
├── popup.html            # Extension popup interface
├── popup.js              # Popup logic and PhotoPrism API integration
├── config.html           # Configuration page for PhotoPrism instances
├── config.js             # Configuration management
├── storage-utils.js      # Instance-specific data storage utilities
└── manifest.json         # Extension configuration
```

### Key Features
- **Instance-specific configuration**: Support multiple PhotoPrism instances
- **Label caching**: Cache label IDs for faster removal operations
- **Execution history**: Track operations with success/failure counts
- **Retry functionality**: Retry failed operations on specific photos
- **Debug mode**: Enable detailed logging for troubleshooting

### API Integration
The extension uses PhotoPrism's REST API:
- **Authentication**: Uses session token from PhotoPrism's localStorage
- **Add label**: POST `/api/v1/photos/{uid}/label`
- **Remove label**: DELETE `/api/v1/photos/{uid}/label/{labelId}`

### Development Setup
1. Clone the repository
2. Load as unpacked extension in Chrome developer mode
3. Configure your PhotoPrism instance URL in the extension settings
4. Test on a PhotoPrism instance with selected photos
