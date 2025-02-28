# Overlay

[![Watch the video](https://cdn.loom.com/sessions/thumbnails/f7b5958bb7f14e4db3566eb4c23d6e70-bd26582bfc32b03b-full-play.gif)](https://www.loom.com/share/f7b5958bb7f14e4db3566eb4c23d6e70)

A Chrome extension that enhances your browsing experience with AI-powered assistance, supporting multiple models including OpenAI, Anthropic, Google Gemini, and local Ollama models.

## Features

### Core Features
- ✅ Chrome Manifest V3 compatible
- ✅ Firefox compatible build pipeline
- ✅ Dark/Light theme support
- ✅ Sidepanel integration for easy access
- ✅ Responsive and modern UI design with Tailwind CSS

### AI Integration
- ✅ Multi-model support
  - OpenAI integration
  - Anthropic Claude integration
  - Gemini Pro integration
  - Local model execution via Ollama
  - Automatic model switching and persistence
- ✅ Custom model configuration
  - Default model selection in options
  - Dynamic model discovery
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
- ✅ Secure API key storage
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

   b. For Cloud Models:
   - OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Anthropic API key from [Anthropic Console](https://console.anthropic.com/keys)
   - Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Add keys in the extension options

3. Start Ollama service with Chrome extension permissions:
```bash
OLLAMA_ORIGINS=chrome-extension://* ollama serve
```

Note: The extension will automatically discover available models from all providers.

4. Start development:
```bash
pnpm dev
```

5. Build for production:
```bash
pnpm build        # For Chrome
pnpm build:firefox # For Firefox
```

## Development

### Project Structure

```
overlay/
├── chrome-extension/     # Chrome extension core
├── packages/             # Shared packages
│   ├── dev-utils/        # Development utilities
│   ├── hmr/              # Hot module replacement
│   ├── shared/           # Shared components and utilities
│   ├── storage/          # Storage management
│   ├── ui/               # UI components
│   └── ... 
└── pages/                # Extension pages
    ├── content/          # Content scripts
    ├── popup/            # Popup UI
    ├── side-panel/       # Sidepanel UI
    ├── options/          # Options page
    └── ...
```

### Commands

- `pnpm dev` - Start development server
- `pnpm dev:firefox` - Start development server for Firefox
- `pnpm build` - Build for Chrome production
- `pnpm build:firefox` - Build for Firefox production
- `pnpm zip` - Build and package Chrome extension
- `pnpm zip:firefox` - Build and package Firefox extension
- `pnpm lint` - Run linting
- `pnpm type-check` - Type check all TypeScript files
- `pnpm e2e` - Run end-to-end tests

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `dist` directory from this project

## Requirements

- Node.js >= 22.12.0
- pnpm 9.15.1+
- Chrome browser or Firefox

## Based on
- [Chrome Extension Boilerplate](https://github.com/lsgrep/chrome-extension-boilerplate)

## License

MIT