import { sampleFunction } from '@src/sampleFunction';
import { setupImageDragHandling } from '@src/imageDragHandler';

console.log('Overlay content script loaded');

// Initialize image drag and drop functionality
setupImageDragHandling();

// Shows how to call a function defined in another module
sampleFunction();
