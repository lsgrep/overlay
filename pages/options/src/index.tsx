import { createRoot } from 'react-dom/client';
import '@extension/ui/dist/global.css';
import Options from '@src/Options';

function init() {
  // Then render the app
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);
  root.render(<Options />);
}

init();
