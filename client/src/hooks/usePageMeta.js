import { useEffect } from 'react';

/**
 * Custom hook to dynamically update page document.title and meta description.
 * Restores previous title when unmounting if needed.
 *
 * @param {string} title - The title to display in browser tab
 * @param {string} [description] - Optional meta description for SEO
 */
export const usePageMeta = (title, description = '') => {
  useEffect(() => {
    if (title) {
      document.title = title;
    }

    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    }
  }, [title, description]);
};

export default usePageMeta;
