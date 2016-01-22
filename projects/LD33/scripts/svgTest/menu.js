base.registerModule('menu', function(module) {
  var gui = base.importModule('gui');
  var engine = base.importModule('engine');
  var resource = base.importModule('resource');
  
  module.MenuTest = base.extend(gui.Menu, "MenuTest", {
    constructor: function MenuTest() {
      this.label = null;
      this.canvas = engine.makeCanvas(640, 480);
      this.constructor$Menu();
    },
    addElements: function addElements() {
      var xml = resource.getResource('gui');
      this.label = xml.getElementById('theLabel');
      canvg(this.canvas, xml);
    },
    render: engine.listener(engine.EventRender.ID, function(event) {
      this.label.innerHTML = Date.now();
      event.context.drawImage(this.canvas, 0, 0);
    })
  });
  module.MenuTest.prototype.compile();
});