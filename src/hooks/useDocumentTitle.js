import { useEffect } from 'react';

/**
 * useDocumentTitle — sets document.title for the lifetime of the calling
 * component and restores the previous title on unmount. Keeps per-route titles
 * correct as the SPA navigates between pages.
 */
export default function useDocumentTitle(title) {
  useEffect(() => {
    if (!title) return undefined;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
