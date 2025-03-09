# Overlay

[![Watch the video](https://cdn.loom.com/sessions/thumbnails/f7b5958bb7f14e4db3566eb4c23d6e70-bd26582bfc32b03b-full-play.gif)](https://www.loom.com/share/f7b5958bb7f14e4db3566eb4c23d6e70)

Overlay is a powerful Chrome extension that transforms your browsing experience through advanced AI capabilities. It leverages large language models (LLMs) to provide context-aware assistance, content analysis, and task automation as you browse the web. The extension supports multiple models including OpenAI, Anthropic Claude, Google Gemini, and local Ollama models, giving users flexibility in their AI interactions.

## Features

### Core Features
- ✅ Chrome Manifest V3 compatible
- ✅ Firefox compatible build pipeline
- ✅ Dark/Light theme support
- ✅ Sidepanel integration for easy access
- ✅ Responsive and modern UI design with Tailwind CSS

### AI Integration & LLM-Enhanced Browsing
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
  - Webpage content analysis and summarization
  - Task extraction and planning from web content
- ✅ Advanced LLM capabilities
  - Intelligent response generation based on web context
  - Custom prompting system for targeted assistance
  - Structured data extraction from webpages
  - Semantic understanding of page content
- 📝 Chat history and conversation management

### Content Features
- ✅ Inspirational quotes on new tab
- ✅ Quote categorization and attribution
- 🚧 Customizable new tab layout
- ✅ Task identification and planning
  - Automatic task detection from page content
  - Step-by-step task breakdown for complex topics
  - Progress tracking for identified tasks
- 🚧 Personalized content recommendations

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

## Project Vision & Roadmap

Overlay aims to fundamentally transform how users interact with web content by leveraging the power of large language models. Our vision is to create an intelligent companion that understands user intent, provides contextual assistance, and automates repetitive tasks across the browsing experience.

### Future Development Plans

- 🔮 Advanced webpage analysis with semantic understanding
- 🔮 Personalized assistance based on browsing patterns and preferences
- 🔮 Proactive information discovery and curation
- 🔮 Cross-page content correlation and knowledge synthesis
- 🔮 Fine-tuned domain-specific assistance for specialized workflows
- 🔮 Enhanced privacy-preserving local model integration

We believe LLMs have the potential to create a more intuitive, efficient, and personalized web browsing experience that adapts to each user's unique needs and interests.

## Based on
- [Chrome Extension Boilerplate](https://github.com/lsgrep/chrome-extension-boilerplate)

## License

MIT