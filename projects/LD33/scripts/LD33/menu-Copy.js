base.registerModule('menu', function(module) {
  var engine = base.importModule('engine');
  var gui = base.importModule('gui');
  var level = base.importModule('level');
  var util = base.importModule('util');
  var resource = base.importModule('resource');
  var data = base.importModule('data');
  var visual = base.importModule('visual');
  
  /**
   * the menu for playing
   */
  module.MenuPlay = base.extend(gui.Menu, "MenuPlay", {
    constructor: function MenuPlay() {
      this.constructor$Menu();
    },
    addElements: function addElements() {
      //bottom of screen
      var controlPanel = new Panel(new util.Rect(0, 320, 640, 160), "blue");
      var manaBar = new Bar(new util.Rect(10, 10, 150, 20));
      controlPanel.addSprite(manaBar);
      
      //topof screen
      var stationPanel = new Panel(new util.Rect(0, 0, 640, 320), "gray");
      var farmingStation = new Station(new util.Rect(10, 10, 213, 300), "farming");
      stationPanel.addSprite(farmingStation);
      
      this.addSprite(controlPanel);
      this.addSprite(stationPanel);
    }
  });
  
  var Panel = base.extend(engine.Group, "Panel", {
    constructor: function Panel(box, color) {
      this.constructor$Group();
      this.box = box;
      this.color = color;
    },
    render: engine.listener(engine.EventRender.ID, function render(event) {
      var context = event.context;
      context.beginPath();
      context.rect(this.box.left, this.box.top, this.box.width, this.box.height);
      context.closePath();
      context.fillStyle = this.color;
      context.fill();
    })
  });
  Panel.prototype.compile();
  
  /**
   * kind like a progress bar
   */
  var Bar = base.extend(engine.Sprite, "Bar", {
    constructor: function HealthBar(box) {
      this.constructor$Sprite();
      this.box = box;
    },
    render: engine.listener(engine.EventRender.ID, function render(event) {
      var context = event.context;
      var x =  this.box.left + this.parentGroup.box.left;
      var y = this.box.top + this.parentGroup.box.top;
      
      context.beginPath();
      context.rect(x, y, this.box.width, this.box.height);
      context.closePath();
      context.fillStyle = "white";
      context.fill();
      
      var progress = 0.75; //hardcoded for now
      var smallBarHeight = this.box.height - 4;
      context.beginPath();
      context.rect(x + 2, y + 2, this.box.width * progress - 4, smallBarHeight);
      context.closePath();
      context.fillStyle = "green";
      context.fill();
      
      var textSize = smallBarHeight - 4;
      context.font = textSize + "px Arial";
      context.fillStyle = "black";
      var text = "Mana " + Math.round(progress * 100) + "%";
      var textWidth = context.measureText(text).width;
      var textX = x + this.box.width/2 - textWidth/2;
      var textY = y + this.box.height/2 - textSize/2;
      context.fillText(text, textX, textY);
    })
  });
  Bar.prototype.compile();
  
  /**
   * a station where minions do things
   */
  var Station = base.extend(Panel, "Station", {
    constructor: function Station(box, name) {
      this.constructor$Panel(box, "orange");
      this.name = name;
      this.prodPoints = 100; //hardcoded for now
    },
    render: engine.listener(engine.EventRender.ID, function(event) {
      this.render$Panel(event);
      var context = event.context;
      context.drawImage(visual.graphicsProvider.textures.FARM, 
          this.box.left, this.box.top);
      context.fillStyle = "black";
      context.font = "24px Arial";
      context.fillText(this.name, this.box.left + 64, this.box.top + 10);
    })
  });
  Station.prototype.compile();
});