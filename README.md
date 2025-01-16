# Local Ollama Chat - Chrome Extension

A Chrome extension that adds a chat sidebar powered by [Ollama](https://ollama.ai/), allowing you to interact with AI models locally while browsing the web.

![Local Ollama Chat Screenshot](https://raw.githubusercontent.com/lsgrep/chrome-extension-ollama-chat/refs/heads/main/screenshot.png)

## Features

- 🚀 Seamless integration with Ollama's local AI models
- 💬 Chat sidebar that works on any webpage
- 📝 Context-aware conversations using current webpage content
- 🔄 Easy model switching between different Ollama models
- 🎨 Clean, modern UI with a responsive design
- 🔒 Privacy-focused: all processing happens locally

## Prerequisites

- [Chrome](https://www.google.com/chrome/) browser
- [Ollama](https://ollama.ai/) installed and running locally
- At least one Ollama model pulled (default: `phi4`)

## Installation

1. Clone this repository:
   ```bash
   git clone git@github.com:lsgrep/chrome-extension-ollama-chat.git
   ```

2. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the directory containing this extension

3. Make sure Ollama is running with your desired model:
   ```bash
    OLLAMA_ORIGINS=chrome-extension://* ollama serve
   ```

## Usage

1. Click the extension icon in Chrome to toggle the chat sidebar
2. Select your preferred Ollama model from the dropdown
3. Start chatting with the AI assistant
4. Use the "Get Page Content" button to include current webpage context in your conversation
5. Reset the conversation anytime using the reset button

## Configuration

The extension connects to Ollama's API at `http://localhost:11434` by default. The default model is set to `phi4`, but you can change models through the UI.

## Development

The extension is built with vanilla JavaScript and follows Chrome's Manifest V3 specifications. Key files:

- `manifest.json`: Extension configuration
- `background.js`: Handles Ollama API communication
- `content.js`: Manages the sidebar UI and user interactions
- `styles.css`: Styling for the sidebar

## License

[![License: WTFPL](https://img.shields.io/badge/License-WTFPL-brightgreen.svg)](http://www.wtfpl.net/about/)

This project is licensed under the WTFPL - Do What the Fuck You Want to Public License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Built with [Ollama](https://ollama.ai/)
- Inspired by the need for private, local AI chat interactions
