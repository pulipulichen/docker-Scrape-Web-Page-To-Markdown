/**
 * Remove image elements and unwrap anchors, keeping link text only.
 * Anchors with no visible text (including whitespace-only) are removed entirely.
 */
module.exports = function stripImgAndLinks($) {
  $('picture').remove();
  $('img').remove();
  $('a').each((_, el) => {
    const $a = $(el);
    const hasVisibleText = $a.text().replace(/\s/g, '') !== '';
    if (!hasVisibleText) {
      $a.remove();
    } else {
      $a.replaceWith($a.contents());
    }
  });
  return $;
};
