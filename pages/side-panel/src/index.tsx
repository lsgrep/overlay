import { createRoot } from 'react-dom/client';
import '@extension/ui/dist/global.css';
import SidePanel from '@src/SidePanel';
import { ChatProvider } from './contexts/ChatContext';

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);

  // Wrap the app in ChatProvider to make chat context available
  root.render(
    <ChatProvider initialConfig={{ mode: 'conversational', selectedModel: '' }}>
      <SidePanel />
    </ChatProvider>,
  );
}

init();
