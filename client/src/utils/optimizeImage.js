/**
 * #10 Cloudinary Image Optimization
 * Adds auto-format (f_auto), auto-quality (q_auto), and width cap transforms.
 * Handles URLs that already contain transforms to avoid double-transforms.
 */
export const optimizeImage = (url, width = 400) => {
  if (!url) return null;
  if (!url.includes('cloudinary.com')) return url;
  // Strip any existing f_auto, q_auto, w_NNN transforms to avoid duplicates
  const cleaned = url.replace(/\/(f_auto,?|q_auto,?|w_\d+,?)+\//g, '/');
  return cleaned.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
};
