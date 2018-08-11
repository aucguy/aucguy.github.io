/**
 * does gui
 */
base.registerModule('gui', function(module) {
  var engine = base.importModule('engine');
  
	/**
	 * initializes this module
	 */
	module.init = function() {
		MenuManager.instance = new MenuManager();
		engine.World.instance.addSprite(MenuManager.instance);
	};
	
	/**
	 * a generic class for a menu
	 */
	var Menu = base.extend(engine.Group, "Menu", {
	  constructor: function Menu() {
		  this.constructor$Group();
		  this.addElements();
	  },
	 /**
	   * adds the sprites to this menu. supposed to be overriden
	   */
	  addElements: function addElements() {
	  }
	});
	module.Menu = Menu;
	
	/**
	 * an event for when an element is clicked (mouse down and inside the element)
	 */
	EventButtonClick = base.extend(engine.Event, "EventButtonClick", {
	  constructor: function EventButtonClick() {
		  this.constructor$Event(EventButtonClick.ID);
	  }
	});
	EventButtonClick.ID = engine.Event.nextEventId();

	/**
	 * a button
	 * 	canvas - the special formated button svg
	 * 	x - the x position
	 * 	y - the y positon
	 * 	text - the text on the button
	 */
	var Button = base.extend(engine.SimpleGraphic, "Button",  {
	  constructor: function Button(canvas, x, y, text) {
		  this.constructor$SimpleGraphic(engine.makeCanvas(200, 100), x, y);
		  this.rect = new util.Rect(-1, -1, -1, -1);
		  this.text = text;	
		
		  var dom = resource.getResource("gui/button.svg");
		  xml.removeMetadata(dom);

		  function convertElement(id, type) {
			  var rectattrs = ['x', 'y', 'width', 'height'];
			  var element = dom.getElementById(id);
			  element.parentNode.removeChild(element);
			  var obj = xml.copyAttributes(xml.ensureType(element, type), rectattrs);
			  var rect = new util.Rect(safeParseInt(obj.x), safeParseInt(obj.y), safeParseInt(obj.width), safeParseInt(obj.height));
			  return rect;
		  }

		  var leftrect = convertElement("leftrect", 'rect');
		  var midrect = convertElement("midrect", 'rect');
		  var rightrect = convertElement("rightrect", 'rect');
		  var textrect = new util.Rect(-1,-1,-1,-1);

		  var textelem = dom.getElementById("text");
	  	textelem.parentNode.removeChild(textelem);
	  	textrect.left = textelem.getAttribute("x");
		  textrect.top = textelem.getAttribute("y");

		  var tmp = engine.makeCanvas(1,1).getContext("2d");
		  tmp.font = "20px Georgia";
		  tmp.textBaseline = "top";
	  	for(var i=0; i<textelem.childNodes.length; i++) {
			  if(textelem.childNodes[i].nodeName == "tspan") {
				  var size = tmp.measureText(textelem.innerHTML);
				  textrect.width = size.width;
			  }
	  	}

		  var textoffset = textrect.left-leftrect.left;

	  	var imagewidth = parseInt(dom.getElementsByTagName("svg")[0].getAttribute("width"));
		  var imageheight = parseInt(dom.getElementsByTagName("svg")[0].getAttribute("height"));
		  var image = engine.makeCanvas(imagewidth, imageheight);
		  image.getContext("2d").drawSvg(dom, 0, 0, imagewidth, imageheight);

		  dom = null;
		  var leftimage = visual.clipCanvas(image, leftrect.left, leftrect.top, leftrect.width, leftrect.height);
		  var midimage = visual.clipCanvas(image, midrect.left, midrect.top, midrect.width, midrect.height);
		  var rightimage = visual.clipCanvas(image, rightrect.left, rightrect.top, rightrect.width, rightrect.height);

		  canvas = engine.makeCanvas(0, leftimage.height);
		  var context = canvas.getContext("2d");

		  var textstyle = xml.copyAttributesFromStyle(textelem.getAttribute("style"), ['font-size', 'font-family']);
		  textstyle.font = textstyle['font-size']+" "+textstyle['font-family'];
		  context.font = textstyle.font;
		  context.textBaseline = "bottom";
		  var parts = Math.ceil((context.measureText(this.text).width+textoffset)/midimage.width);
		  canvas.width = leftimage.width + parts*midimage.width + rightimage.width;
		  context.font = textstyle.font; //evidently gets reset when canvas.width is set
		  context.textBaseline = "bottom";

		  context.drawImage(leftimage, 0, 0);
		  var render_x = leftimage.width;
		  for(i=0; i<parts; i++) {
		  	context.drawImage(midimage, render_x, 0);
		  	render_x += midimage.width;
		  }
		  context.drawImage(rightimage, render_x, 0);
		  context.strokeStyle = "#000000";
		  context.strokeText(this.text, leftrect.left + textoffset, textrect.top);
		  this.canvas = canvas;
		  this.rect.left = this.getX();
		  this.rect.top = this.getY();
		  this.rect.width = this.canvas.width;
		  this.rect.height = this.canvas.height;
	  },
	  /**
	   * used to handle 'clicking'
	   */
	  onMouseDown: engine.listener(engine.EventMouseDown.ID, function(event) {
		  if(this.rect.collidepoint(event.x, event.y)) {
		  	this.onEvent(new EventButtonClick(this));
		  }
	  })
	});

	module.Button = Button;
	/**
	 * this buttons bounding box
	 */
	Button.prototype.rect = null;
	/**
	 * the text of the button
	 */
	Button.prototype.text = null;
	
	Button.prototype.compile();
	
	/**
	 * a button that when clicked changes the menu
	 * 	@param menuConstr - the menu class to switch to
	 */
	var ButtonMenuChange = base.extend(Button, "ButtonMenuChange", {
	  constructor: function ButtonMenuChange(canvas, x, y, text, menuConstr) {
		  this.constructor$Button(canvas, x, y, text);
		  this.menuConstr = menuConstr;
	  },
	 	/**
	   * sets the menu
	   */
	  onClicked: engine.listener(EventButtonClick.ID, function(event) {
		  MenuManager.instance.setMenu(new this.menuConstr());
	  })
	});
	module.ButtonMenuChange = ButtonMenuChange;
	ButtonMenuChange.prototype.menuConstr = null;
	ButtonMenuChange.prototype.compile();
	
	/**
	 * a thing that manages menus
	 */
	var MenuManager = base.extend(engine.Group, "MenuManager", { 
	  constructor: function MenuManager() {
		  this.constructor$Group();
		  this.currentMenu = null;
	  },
	  /**
	   * sets the menu to a menu object
	   */
	  setMenu: function setMenu(menu) {
		  if(this.currentMenu !=- null) {
		  	this.removeSprite(this.currentMenu);
		  }
		  if(menu !== null)	{
			  this.addSprite(menu);
		  }
		  this.currentMenu = menu;
	  }
	});
	module.MenuManager = MenuManager;
	/**
	 * the menu manager instance
	 */
	MenuManager.instance = null;
	/**
	 * the current menu
	 */
	MenuManager.prototype.currentMenu = null;
});