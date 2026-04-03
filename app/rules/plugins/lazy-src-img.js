/**
 * Copy common lazy-loading image attributes to src when src is missing or looks like a placeholder.
 */
module.exports = function lazySrcImg($) {
  $('img').each((_, el) => {
    const $img = $(el);
    const src = ($img.attr('src') || '').trim();
    const fromData =
      $img.attr('data-src') ||
      $img.attr('data-lazy-src') ||
      $img.attr('data-original') ||
      $img.attr('data-lazy');
    if (!fromData) return;
    const isPlaceholder =
      !src ||
      src.startsWith('data:') ||
      /placeholder|blank|spacer|1x1/i.test(src);
    if (isPlaceholder) {
      $img.attr('src', fromData);
    }
  });
  return $;
};
