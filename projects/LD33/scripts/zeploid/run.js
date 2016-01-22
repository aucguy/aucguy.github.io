/**
 * the thing that starts it all
 */
base.registerModule('run', function(module) {
  var resource = base.importModule('resource');
  base.importModule('main');

  /**
   * the id for the display canvas
   */
  const
  DISPLAY_ID = "display";

  /**
   * the width of the display canvas
   */
  module.SCREEN_WIDTH = null;
  /**
   * the height of the display canvas
   */
  module.SCREEN_HEIGHT = null;
  /**
   * the number returned by setInterval for the loading screen
   */
  var loadInterval = null;

  /**
   * hook used to initialize the game once all initial modules are loaded
   */
  if (!module.onInit) {// might have bean set already
    module.onInit = function() {
    };
  }

  /**
   * whether or not the initialization process can happen (ie have the
   * resources been ajaxed)
   */
  if (!module.initDone) { // might have been set already when loading other
    // modules
    module.initDone = false;
  }

  /**
   * call this to start everything
   */
  function main() {
    renderLoadingScreen();
    loadInterval = base.setInterval(load, 1);
  }

  /**
   * initializes everything
   */
  function init() {
    var engine = base.importModule('engine');

    module.SCREEN_WIDTH = document.getElementById(DISPLAY_ID).width;
    module.SCREEN_HEIGHT = document.getElementById(DISPLAY_ID).height;
    engine.DISPLAY_ID = DISPLAY_ID;
    engine.init();

    engine.World.prototype.handleError = function(error, event) {
      console.error("error occured when handling event " + event);
      base.onError(error);
    };

    module.onInit();
  }

  /**
   * called to setup the loading screen, and if all the resources are loaded,
   * initialize and start the game
   */
  function load() {
    renderLoadingScreen();
    if (module.initDone && resource.getLoading() === 0) {
      init();
      base.clearInterval(loadInterval);
      var engine = base.importModule('engine');
      base.setInterval(engine.tick, 1.0 / 30);
    }
  }

  /**
   * renders the loading screen
   */
  function renderLoadingScreen() {
    var display = document.getElementById(DISPLAY_ID);
    var context = display.getContext("2d");

    context.fillStyle = "#000000";
    context.fillRect(0, 0, display.width, display.height);
    context.textBaseline = "top";
    context.font = "72px Arial";
    context.strokeStyle = "#FFFFFF";
    var metric = context.measureText("loading...");
    var periods = Math.floor(new Date().getTime() % 3000 / 1000);
    var text;
    if (periods === 0) {
      text = "loading.";
    } else if (periods == 1) {
      text = "loading..";
    } else {
      text = "loading...";
    }
    context.strokeText(text, display.width / 2 - metric.width / 2, display.height / 2 - 72 / 2);
  }
  main();
});