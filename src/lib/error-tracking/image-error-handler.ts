import { logError } from './ErrorBoundary';

/**
 * Tracks image loading errors
 */
export function handleImageError(
  imageSrc: string,
  context?: string,
  metadata?: Record<string, unknown>
) {
  logError({
    type: 'image-load-error',
    message: `Failed to load image: ${imageSrc}`,
    url: typeof window !== 'undefined' ? window.location.href : '',
    metadata: {
      imageSrc,
      context,
      ...metadata,
    },
  });
}

/**
 * React hook for image error handling
 */
export function useImageErrorHandler(context?: string) {
  return (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    handleImageError(img.src, context, {
      alt: img.alt,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    });
  };
}
