# Overlay

[![Watch the video](https://cdn.loom.com/sessions/thumbnails/f7b5958bb7f14e4db3566eb4c23d6e70-bd26582bfc32b03b-full-play.gif)](https://www.loom.com/share/f7b5958bb7f14e4db3566eb4c23d6e70)

Overlay is a powerful Chrome extension that transforms your browsing experience through advanced AI capabilities. It leverages large language models (LLMs) to provide context-aware assistance, content analysis, task management, and note-taking as you browse the web. The extension integrates multiple AI models including OpenAI, Anthropic Claude, Google Gemini, and local Ollama models, giving users flexibility in their AI interactions and privacy preferences.

## Features

### Core Features
- ✅ Chrome Manifest V3 compatible
- ✅ Firefox compatible build pipeline
- ✅ Dark/Light theme support
- ✅ Sidepanel integration for AI chat and tools
- ✅ Responsive and modern UI design with Tailwind CSS
- ✅ Multiple language support (English, German, Spanish, French, Japanese, Korean, Russian, Chinese)

### AI Integration & LLM-Enhanced Browsing
- ✅ Multi-model support
  - OpenAI integration (GPT models)
  - Anthropic Claude integration
  - Google Gemini Pro integration
  - Local model execution via Ollama
  - Automatic model switching and persistence
- ✅ Custom model configuration
  - Default model selection in options
  - Dynamic model discovery
  - Automatic retry mechanism for API rate limits
- ✅ Context-aware browsing assistance
  - Interactive and conversational chat modes
  - Image analysis via drag-and-drop
  - Context menu integration for quick actions
  - Webpage content analysis and summarization
- ✅ Advanced LLM capabilities
  - Intelligent response generation based on web context
  - Custom prompting system for targeted assistance
  - Structured data extraction from webpages
  - Semantic understanding of page content
- ✅ Chat interface with comprehensive conversation management

### Productivity Features
- ✅ Note-taking system
  - Create notes from web content
  - Save and organize information from any webpage
  - View and manage notes through the side panel
- ✅ Task management
  - Create tasks from web content
  - Google Tasks integration on new tab page
  - Step-by-step task breakdown for complex activities
  - Progress tracking for identified tasks
- ✅ Calendar integration on new tab page
- ✅ Inspirational quotes on new tab page
- ✅ Customizable appearance settings

### Privacy & Security
- ✅ Local model execution via Ollama for privacy-conscious users
- ✅ Secure API key storage
- ✅ Proxy mode for API requests
- ✅ No unnecessary data collection or tracking

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
│   ├── src/              # Core extension code
│   │   └── background/   # Background service worker
├── packages/             # Shared packages
│   ├── dev-utils/        # Development utilities
│   ├── hmr/              # Hot module replacement
│   ├── shared/           # Shared components and utilities
│   ├── storage/          # Storage management
│   ├── ui/               # UI components
│   └── ... 
└── pages/                # Extension pages
    ├── content/          # Content scripts for webpage interaction
    ├── content-runtime/  # Runtime script for content features
    ├── content-ui/       # UI components injected into webpages
    ├── popup/            # Popup UI with login functionality
    ├── side-panel/       # Sidepanel with AI chat and tools
    ├── options/          # Configuration page with multiple tabs
    ├── new-tab/          # Enhanced new tab with tasks and calendar
    ├── devtools/         # DevTools integration
    └── devtools-panel/   # Custom panel for DevTools
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

### Chrome Installation (Development Build)
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `dist` directory from this project
4. Pin the extension to your toolbar for easy access

### Firefox Installation (Development Build)
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select the `web-ext-artifacts` directory and choose the ZIP file

### Using the Extension
1. Click the extension icon in the toolbar to access the popup interface
2. Use the side panel for AI chat and tools by clicking the side panel icon or using keyboard shortcuts
3. Configure your preferred AI providers and settings in the options page
4. Enjoy enhanced productivity with the custom new tab page

## Requirements

- Node.js >= 22.12.0
- pnpm 9.15.1+
- Chrome browser or Firefox

## Project Vision & Roadmap

Overlay aims to fundamentally transform how users interact with web content by leveraging the power of large language models. Our vision is to create an intelligent companion that understands user intent, provides contextual assistance, and enhances productivity across the browsing experience.

### Key Components

- **AI Chat Interface**: Chat with multiple AI models right from your browser
- **Image Analysis**: Drag images directly to the side panel for AI analysis
- **Task Management**: Create, track, and complete tasks with Google Tasks integration
- **Note-Taking**: Save important information from webpages
- **Calendar View**: See upcoming events at a glance
- **Custom New Tab**: Enhanced productivity with tasks, calendar, and inspiration

### Future Development Plans

- 🔮 Advanced webpage analysis with semantic understanding
- 🔮 Personalized assistance based on browsing patterns and preferences
- 🔮 Proactive information discovery and curation
- 🔮 Cross-page content correlation and knowledge synthesis
- 🔮 Fine-tuned domain-specific assistance for specialized workflows
- 🔮 Enhanced privacy-preserving local model integration
- 🔮 Additional productivity integrations with third-party services
- 🔮 Collaborative features for team productivity

We believe LLMs have the potential to create a more intuitive, efficient, and personalized web browsing experience that adapts to each user's unique needs and interests.

## Based on
- [Chrome Extension Boilerplate](https://github.com/lsgrep/chrome-extension-boilerplate)

## License

Commercial - See the [LICENSE](./LICENSE) file for details.