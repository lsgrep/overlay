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