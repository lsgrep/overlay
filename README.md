# Overlay Sidebar Extension

A Chrome extension that adds a sleek sidebar interface for chatting with local LLMs using Ollama. Built with React, TypeScript, and Vite.

## Features

- 🚀 Smooth sidebar integration with any webpage
- 💬 Chat interface with support for Markdown formatting
- 🔄 Real-time streaming responses
- 🎨 Clean and modern UI design
- 🤖 Multiple model support via Ollama
- ⌨️ Keyboard shortcuts for quick access

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Chrome browser
- [Ollama](https://ollama.ai/) installed and running locally

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd overlay
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory from the project

## Development

Start the development server:
```bash
npm run dev
```

The extension will be rebuilt automatically when you make changes.

## Usage

1. Click the extension icon in Chrome to toggle the sidebar
2. Select your preferred Ollama model from the dropdown
3. Start chatting!

## Architecture

- React + TypeScript for the UI
- Vite for building and development
- Chrome Extension Manifest V3
- Ollama API for local LLM integration
- Real-time streaming using Server-Sent Events

## Version History

### 1.0.1
- Improved sidebar styling and layout
- Added smooth animations
- Fixed visibility toggle
- Adjusted width for better readability

### 1.0.0
- Initial release
- Basic chat functionality
- Ollama integration
- Markdown support

## License

MIT License - feel free to use and modify as needed!