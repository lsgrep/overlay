import { createRoot } from 'react-dom/client';
// import '@extension/ui/dist/global.css';
import '../../../packages/ui/dist/global.css';
import SidePanel from '@src/SidePanel';

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);
  root.render(<SidePanel />);
}

init();
