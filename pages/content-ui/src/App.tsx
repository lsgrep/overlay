import { useEffect } from 'react';
import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import SelectionPopup from './components/SelectionPopup';

export default function App() {
  const theme = useStorage(exampleThemeStorage);

  useEffect(() => {
    console.log('content ui loaded');
  }, []);

  return (
    <>
      <SelectionPopup />
    </>
  );
}
