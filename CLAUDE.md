# Overlay Chrome Extension Development Guide

## Build Commands
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm lint` - Run linting with auto-fix
- `pnpm lint:fix` - Run focused linting with auto-fix
- `pnpm type-check` - Type check all TypeScript files
- `pnpm e2e` - Run end-to-end tests
- `pnpm e2e:firefox` - Run end-to-end tests for Firefox
- Single test: `cd tests/e2e && pnpm e2e -- --spec ./specs/[test-file].test.ts`

## Code Style Guidelines
- **TypeScript**: Strict mode, explicit type imports using `import type`
- **React**: Use functional components with hooks, JSX runtime
- **Formatting**: Uses Prettier for consistent formatting
- **Imports**: Type imports separate from value imports, grouped by origin
- **File naming**: PascalCase for React components, camelCase for utilities
- **Component structure**: Props interface using `type Props = {}`, followed by function
- **Error handling**: Use try/catch with appropriate error logging/handling
- **State management**: Prefer React context for shared state
- **CSS**: Use Tailwind CSS with class-variance-authority for variants

## Tools & Technology
- TypeScript, React, TailwindCSS, Vite
- Chrome Extension Manifest V3 compatible
- pnpm workspace for monorepo management

# Model Context Protocol (MCP) Integration Design

## Overview
The Model Context Protocol (MCP) integration enhances the side panel chat interface by enabling standardized context passing between the UI and different LLM providers. This allows for richer context sharing including images, code snippets, and webpage content in a format supported by Claude, OpenAI, Gemini, and other models.

## Key Components

### 1. Context Types
- **Message Types** (`types.ts`): Extended to include MCP context items
- **Context Items**: Standardized format for different context types (text, image, code, etc.)
- **Metadata**: Information about context origin and transformations

### 2. Service Layer Integration
- **ChatService**: Enhanced to collect, normalize and pass MCP context
- **LLM Services**: Updated request formatting for each provider
- **Context Extraction**: Methods for gathering context from different sources

### 3. UI Components
- **Input Handling**: Enhanced to accept and display MCP context
- **Visualization**: Indicators for when context is being used
- **Drag-and-Drop**: Support for adding image context

## Implementation Plan

1. Define MCP context interface in `/services/llm/types.ts`
2. Update LLM service implementations to support MCP
3. Enhance ChatService to handle context collection
4. Modify UI components to show context indicators
5. Add support for context extraction from page content
6. Implement provider-specific transformations

## Data Flow

1. User initiates chat with context (selection, image, etc.)
2. Context is normalized to MCP format
3. Provider-specific adapters format context for each LLM
4. Response is captured and displayed to user
5. Context is preserved in conversation history

## Testing Strategy
- Unit tests for context normalization
- Integration tests with mock LLM services
- E2E tests for different context scenarios (text selection, image upload, etc.)