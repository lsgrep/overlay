# Overlay

[![Watch the video](https://cdn.loom.com/sessions/thumbnails/f7b5958bb7f14e4db3566eb4c23d6e70-bd26582bfc32b03b-full-play.gif)](https://www.loom.com/share/f7b5958bb7f14e4db3566eb4c23d6e70)

A Chrome extension that enhances your browsing experience with AI-powered assistance.

## Features

### Core Features
- ✅ Chrome Manifest V3 compatible
- ✅ Dark/Light theme support
- ✅ Sidepanel integration for easy access
- ✅ Responsive and modern UI design

### AI Integration
- ✅ Intelligent chat interface with multiple model support
  - Gemini Pro integration with API key
  - Local model execution via Ollama
  - Automatic model switching and persistence
- ✅ Custom model configuration
  - Default model selection in options
  - Dynamic model discovery for both Gemini and Ollama
  - Automatic retry mechanism for API rate limits
- ✅ Context-aware browsing assistance
  - Interactive and conversational modes
  - Context menu integration for quick actions
- 📝 Chat history and conversation management

### Content Features
- ✅ Inspirational quotes on new tab
- ✅ Quote categorization and attribution
- 🚧 Customizable new tab layout
- 📝 Task management

### Privacy & Security
- ✅ Local model execution via Ollama
- ✅ No data collection or tracking

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Configure AI Models:

   a. For Ollama (Local Models):
   ```bash
   # Install recommended models
   ollama pull mistral    # Great for general tasks
   ollama pull codellama  # Specialized for code
   ollama pull phi        # Fast and lightweight
   ```

   b. For Gemini (Cloud Models):
   - Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Add the key in the extension options

3. Start Ollama service with Chrome extension permissions:
```bash
OLLAMA_ORIGINS=chrome-extension://* ollama serve
```

Note: The extension will automatically discover available models from both Ollama and Gemini.

4. Start development:
```bash
pnpm dev
```

5. Build for production:
```bash
pnpm build
```

## Development

### Project Structure

```
overlay2/
├── chrome-extension/     # Chrome extension core
├── packages/            # Shared packages
└── pages/              # Extension pages
    ├── content/        # Content scripts
    ├── popup/          # Popup UI
    └── side-panel/     # Sidepanel UI
```

### Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm lint` - Run linting
- `pnpm test` - Run tests

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `dist` directory from this project

## Requirements

- Node.js >= 16
- pnpm
- Chrome browser


## Based on
- [Chrome Extension Boilerplate](https://github.com/lsgrep/chrome-extension-boilerplate)

## License

MIT
