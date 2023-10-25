import { isEmojiSupported } from './is-emoji-supported.js'
function t (t2 = 'Twemoji Country Flags', e = './country-flag-emoji-polyfill/TwemojiCountryFlags.woff2') {
  console.log('starting')
  if (isEmojiSupported('\u{1F60A}') && !isEmojiSupported('\u{1F1E8}\u{1F1ED}')) {
    const n = document.createElement('style')
    n.textContent = `@font-face {
      font-family: "${t2}";
      unicode-range: U+1F1E6-1F1FF, U+1F3F4, U+E0062-E0063, U+E0065, U+E0067,
        U+E006C, U+E006E, U+E0073-E0074, U+E0077, U+E007F;
      src: url('${e}') format('woff2');
      font-display: swap;
    }`
    document.head.appendChild(n)
    return true
  }
  return false
}
export { t as polyfillCountryFlagEmojis }
export default null
