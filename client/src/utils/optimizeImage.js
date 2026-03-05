/**
 * #10 Cloudinary Image Optimization
 * Adds auto-format (f_auto), auto-quality (q_auto), and width cap transforms.
 */
export const optimizeImage = (url, width = 400) => {
  if (!url) return null;
  if (!url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
};
