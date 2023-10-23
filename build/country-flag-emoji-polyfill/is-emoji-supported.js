var cache = new Map();
function isEmojiSupported(unicode) {
  if (cache.has(unicode)) {
    return cache.get(unicode);
  }
  var supported = isSupported(unicode);
  cache.set(unicode, supported);
  return supported;
}
function setCacheHandler(store) {
  cache = store;
}
var isSupported = function() {
  var ctx = null;
  try {
    ctx = document.createElement("canvas")
            .getContext("2d", { willReadFrequently: true });
  } catch (_a) {
  }
  if (!ctx) {
    return function() {
      return false;
    };
  }
  var CANVAS_HEIGHT = 25;
  var CANVAS_WIDTH = 20;
  var textSize = Math.floor(CANVAS_HEIGHT / 2);
  ctx.font = textSize + "px Arial, Sans-Serif";
  ctx.textBaseline = "top";
  ctx.canvas.width = CANVAS_WIDTH * 2;
  ctx.canvas.height = CANVAS_HEIGHT;
  return function(unicode) {
    ctx.clearRect(0, 0, CANVAS_WIDTH * 2, CANVAS_HEIGHT);
    ctx.fillStyle = "#FF0000";
    ctx.fillText(unicode, 0, 22);
    ctx.fillStyle = "#0000FF";
    ctx.fillText(unicode, CANVAS_WIDTH, 22);
    var a = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
    var count = a.length;
    var i = 0;
    for (; i < count && !a[i + 3]; i += 4)
      ;
    if (i >= count) {
      return false;
    }
    var x = CANVAS_WIDTH + i / 4 % CANVAS_WIDTH;
    var y = Math.floor(i / 4 / CANVAS_WIDTH);
    var b = ctx.getImageData(x, y, 1, 1).data;
    if (a[i] !== b[0] || a[i + 2] !== b[2]) {
      return false;
    }
    if (ctx.measureText(unicode).width >= CANVAS_WIDTH) {
      return false;
    }
    return true;
  };
}();
export {isEmojiSupported, setCacheHandler};
export default null;
