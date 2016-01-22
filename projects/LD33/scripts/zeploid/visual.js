/**
 * random visual utilities
 */
base.registerModule('visual', function(module) {
  var util = base.importModule('util');
  var engine = base.importModule('engine');
  
  /**
   * a graphics provider
   */
  var graphicsProvider = {
    constructor : base.abstractMethod,
    /**
     * the textures
     */
    textures : base.abstractField
  };
  module.graphicsProvider = graphicsProvider;
  module.setGraphicsProvider = function setGraphicsProvider(provider) {
    graphicsProvider = provider;
    module.graphicsProvider = provider;
  };
  
  /**
   * returns only the given area in a canvas
   */
  function clipCanvas(canvas, x, y, width, height) {
    var clipped = engine.makeCanvas(width, height);
    clipped.getContext("2d").drawImage(canvas, -x, -y);
    return clipped;
  }
  module.clipCanvas = clipCanvas;

  /**
   * blits src onto dst so that the center of src is at (x, y)
   */
  module.blitCenter = function blitCenter(dst, src, x, y) {
    dst.getContext("2d").drawImage(src, x - src.width / 2, y - src.width / 2);
  };

  /**
   * splits up a spritesheet
   */
  module.splitSheet = function splitSheet(sheet, width, height) {
    var grid = new util.Dictionary();
    for (var x = 0; x < sheet.width / width; x++) {
      for (var y = 0; y < sheet.height / height; y++) {
        grid.put([x, y], clipCanvas(sheet, x * width, y * height, width, height));
      }
    }
    return grid;
  };

  /**
   * resizes an pixelatedly image to the desired size TODO make this work in safari and IE
   */
  module.resize = function resize(original, width, height) {
    //help from http://phoboslab.org/log/2012/09/drawing-pixels-is-hard
    var make = engine.makeCanvas(width, height).getContext("2d");
    make.mozImageSmoothingEnabled = false;
    make.msImageSmoothingEnabled = false;
    make.imageSmoothingEnabled = false;
    make.scale(width / original.width, height / original.height);
    make.drawImage(original, 0, 0);
    return make.canvas;
  };
  
  /**
   * takes an array of textures and flips them around
   */
  module.flipTextures = function flipTextures(original) {
    var make = [];
    for (var i = 0; i < original.length; i++) {
      var img = original[i];
      var context = engine.makeCanvas(img.width, img.height).getContext('2d');
      context.translate(img.width, 0);
      context.scale(-1, 1);
      context.drawImage(img, 0, 0);
      make.push(context.canvas);
    }
    return make;
  };
});