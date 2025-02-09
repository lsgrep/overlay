# Overlay

![Overlay](https://raw.githubusercontent.com/lsgrep/overlay/refs/heads/master/overlay.png)

A Chrome extension that enhances your browsing experience with AI-powered assistance.

## Features

- Intelligent chat interface powered by Ollama
- Dark/Light theme support
- Sidepanel integration for easy access
- Chrome Manifest V3 compatible

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Pull recommended models:
```bash
# Install Phi-4, a lightweight but powerful model
ollama pull phi4

# Install Mistral, great for general-purpose tasks
ollama pull mistral
```

3. Start Ollama service with Chrome extension permissions:
```bash
OLLAMA_ORIGINS=chrome-extension://* ollama serve
```

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
