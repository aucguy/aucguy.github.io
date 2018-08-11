/**
 * run the game!
 */
base.registerModule('main', function(module) {
  var run = base.importModule('run');
  var resource = base.importModule('resource');
  
  /**
   * starts the resource loading
   */
  function startLoading() {
    resource.setResourcePath('');
    resource.loadJson('index', 'assets/index.json', null, resource.query);
  }
  
  module.menuManager = null;
  
  /**
   * initializes game-specific modules
   */
  run.onInit = function onInit() {
    var engine = base.importModule('engine');
    var menu = base.importModule('menu');
    var gui = base.importModule('gui');
    var data = base.importModule('data');
    var minions = base.importModule('minions');
    
    data.init();
    new menu.MenuPlay('gui/play');
    minions.init();
    
    var menuManager = new gui.MenuManager();
    module.menuManager = menuManager;
    menuManager.setMenu(menu.MenuPlay.instance);
    engine.World.instance.addSprite(menuManager);
    engine.World.instance.addSprite(minions.Game.instance);
  };
 
  startLoading();
   run.initDone = true;
});