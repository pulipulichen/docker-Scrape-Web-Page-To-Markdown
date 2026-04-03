/**
 * Remove image elements and unwrap anchors, keeping link text only.
 */
module.exports = function stripImgAndLinks($) {
  $('picture').remove();
  $('img').remove();
  $('a').each((_, el) => {
    const $a = $(el);
    $a.replaceWith($a.contents());
  });
  return $;
};
