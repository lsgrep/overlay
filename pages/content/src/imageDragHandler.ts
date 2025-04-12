/**
 * Handles image drag events from webpages to the Overlay side panel
 */

export function setupImageDragHandling(): void {
  console.log('Setting up image drag handling');

  // Add dragstart handler to document to detect dragging of images
  document.addEventListener('dragstart', event => {
    // Check if dragging an image element
    if (event.target instanceof HTMLImageElement) {
      const imgElement = event.target as HTMLImageElement;
      const imageUrl = imgElement.src;

      console.log('Overlay: Dragging image:', imageUrl);

      // Set the data being dragged - use multiple formats for compatibility
      event.dataTransfer?.setData('text/uri-list', imageUrl);
      event.dataTransfer?.setData('text/plain', imageUrl);
      event.dataTransfer?.setData('overlay/image', imageUrl);

      // Set the drag effect
      event.dataTransfer!.effectAllowed = 'copy';
    }
  });
}
