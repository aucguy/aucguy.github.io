/**
 * a simple game engine
 */
base.registerModule('engine', function(module) {
  /**
   * the id of the canvas element to display everything on
   */
  module.DISPLAY_ID = null;

  /**
   * initializes the module
   */
  module.init = function init() {
    World.instance = new World();
    World.instance.init();
  };

  /**
   * creates a canvas and fills it black
   * TODO move to visual module
   */
  function makeCanvas(width, height) {
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var context = canvas.getContext("2d");
    context.fillStyle = "rgba(0,0,0,0)";
    context.fillRect(0, 0, width, height);
    return canvas;
  }
  module.makeCanvas = makeCanvas;

  /**
   * loads and returns an image. note that the image is not immediatly loaded
   * and the image will be black
   * TODO move to visual module
   */
  module.loadImage = function(width, height, path) {
    var canvas = makeCanvas(width, height);
    var context = canvas.getContext("2d");

    var img = new Image();
    img.addEventListener("load", function customLoad(event) {
      context.clearRect(0, 0, width, height);
      context.drawImage(img, 0, 0);
    });
    img.src = path;
    return canvas;
  };

  /**
   * the event class. Used by listeners to say what
   * callbacks listen to
   */
  var Event = base.extend(Object, 'Event', {
    constructor : function(id) {
      this.id = id;
      this.canceled = false;
    },

    /**
     * an event's id
     */
    id : null,

    /**
     * set to true skip any unrun listener calls for any siblings or
     * parent's children children ect.
     * TODO reimplement
     */
    canceled : null
  });

  Event.current_id = 0;
  module.Event = Event;

  /**
   * returns a unique event id. This might return a
   * different number each run
   */
  Event.nextEventId = function nextEventId() {
    return Event.current_id++;
  };

  /**
   * posted when something happens with the mouse
   */
  var EventMouse = base.extend(Event, 'EventMouse', {
    constructor : function(x, y, id) {
      this.constructor$Event(id);
      this.x = x;
      this.y = y;
    },

    /**
     * the position of the mouse
     */
    x : null,
    y : null
  });

  module.EventMouse = EventMouse;

  /**
   * posted when the mouse is pressed down
   */
  var EventMouseDown = base.extend(EventMouse, 'EventMouseDown', {
    constructor : function(x, y) {
      this.constructor$EventMouse(x, y, EventMouseDown.ID);
    }
  });
  module.EventMouseDown = EventMouseDown;
  EventMouseDown.ID = Event.nextEventId();
  
  /**
   * posted when the mouse is pressed up
   */
  var EventMouseUp = base.extend(EventMouse, 'EventMouseUp', {
    constructor : function(x, y) {
      this.constructor$EventMouse(x, y, EventMouseUp.ID);
    }
  });
  module.EventMouseUp = EventMouseUp;
  EventMouseUp.ID = Event.nextEventId();

  /**
   * posted when the mouse moves
   */
  var EventMouseMove = base.extend(EventMouse, 'EventMouseMove', {
    constructor : function(x, y) {
      this.constructor$EventMouse(x, y, EventMouseMove.ID);
    }
  });
  module.EventMouseMove = EventMouseMove;
  EventMouseMove.ID = Event.nextEventId();

  /**
   * posted when something happens with the mouse
   */
  var EventKey = base.extend(Event, 'EventKey', { // abstract event
    constructor : function(key, id) {
      this.constructor$Event(id);
      this.key = key; // KeyboardEvent.key
    }
  });
  module.EventKey = EventKey;
  /**
   * a string of the key that was pressed
   */
  EventKey.prototype.key = null;

  // currently supported keys
  /**
   * ID_<key> is for when the key is pressed or unpressed or something
   */
  EventKey.keys = [ 'W', 'A', 'S', 'D', ' SPACE', '192:GRAVE' ];
  EventKey.registerIds = function(cl) {
    cl.keybindings = {};
    for (var i = 0; i < EventKey.keys.length; i++) {
      var key = EventKey.keys[i];
      var code;
      var colonIndex = key.indexOf(':');
      if (colonIndex > 0) { //get code
        code = parseInt(key.slice(0, colonIndex));
      } else {
        code = key[0].toUpperCase().charCodeAt(0);
      }
      var name; //get name
      if (key.length == 1) {
        name = key.toUpperCase();
      } else if (colonIndex < 1) {
        name = key.slice(1, key.length).toUpperCase();
      } else {
        name = key.slice(colonIndex + 1);
      }
      var id = Event.nextEventId();
      cl["ID_" + name] = id;
      cl.keybindings[code] = id;
    }
  };

  /**
   * posted when a key is down
   */
  function makeKeyEvent() {
    var cl = base.extend(EventKey, '', {
      constructor : function(key) {
        this.constructor$EventKey(key, cl.keybindings[key]);
      }
    });
    EventKey.registerIds(cl);
    return cl;
  }

  var EventKeyDown = makeKeyEvent();
  module.EventKeyDown = EventKeyDown;
  var EventKeyUp = makeKeyEvent();
  module.EventKeyUp = EventKeyUp;
  var EventKeyPressed = makeKeyEvent();
  module.EventKeyPressed = EventKeyPressed;

  /**
   * posted each tick
   */
  var EventTick = base.extend(Event, 'EventTick', {
    constructor : function EventTick(tickCount) {
      this.constructor$Event(EventTick.ID);
      this.tickCount = tickCount;
    }
  });
  module.EventTick = EventTick;
  EventTick.ID = Event.nextEventId();

  /**
   * posted for each render
   */
  var EventRender = base.extend(Event, 'EventRender', {
    constructor : function EventRender(context) {
      this.constructor$Event(EventRender.ID);
      this.context = context;
    },
    /**
     * the canvas context to render onto
     */
    context : null
  });
  module.EventRender = EventRender;
  EventRender.ID = Event.nextEventId();
  
  /**
   * posted when a sprite is add to a group
   */
  var EventAdded = base.extend(Event, 'EventAdded', {
    constructor : function(group) {
      this.constructor$Event(EventAdded.ID);
      this.group = group;
    },
    group : null
  });
  module.EventAdded = EventAdded;
  EventAdded.ID = Event.nextEventId();

  /**
   * posted when a sprite is removed from a group
   */
  var EventRemoved = base.extend(Event, 'EventRemoved', {
    constructor : function(group) {
      this.constructor$Event(EventRemoved.ID);
      this.group = group;
    },
    /**
     * the group that a sprite got removed from
     */
    group : null
  });
  module.EventRemoved = EventRemoved;
  EventRemoved.ID = Event.nextEventId();

  /**
   * posted right before a group's passers are compiled. Useful for removing
   * the dead from the scene
   */
  var EventCompilePassers = base.extend(Event, 'EventCompilePassers', {
    constructor : function() {
      this.constructor$Event(EventCompilePassers.ID);
    }
  });
  module.EventCompilePassers = EventCompilePassers;
  EventCompilePassers.ID = Event.nextEventId();

  /**
   * used to 'decorate' a function and denote it as being a listener. only
   * works if it is a method of a Sprite
   */
  function listener(event_id, func) {
    func._$event_id = event_id;
    return func;
  }
  module.listener = listener;

  /**
   * represents a sprite
   */
  var Sprite = base.extend(Object, 'Sprite', {
    constructor : function() {
      this.references = 0;
      this.parentGroup = null;
    },

    /**
     * a event id to listener function binding
     */
    handlers : {},

    /**
     * the group this sprite belongs to
     */
    parentGroup : null,

    /**
     * called when an event reaches this sprite
     */
    onEvent : function onEvent(event) {
      if (this.handlers.hasOwnProperty(event.id)) {
        this.handlers[event.id](this, event);
      }
    },

    /**
     * takes the listeners of an object and converts them into a function
     * THIS MUST BE CALLED FOR EACH CLASS FOR EVENT HANDLING TO WORK
     */
    compile : function compile() {
      'use strict';
      var listeners = {};
      // register listeners
      for (var name in this) {
        if (name.indexOf('$') != -1) { // super methods aren't listeners!
          continue;
        }
        var value = this[name];
        if (typeof value == 'function' && typeof value._$event_id != 'undefined') {
          if (typeof listeners[value._$event_id] == 'undefined') {
            listeners[value._$event_id] = [];
          }
          listeners[value._$event_id].push(value);
          value.$name = name;
        }
      }
      // compile listeners
      this.handlers = {};
      for (var id in listeners) {
        var funcs = listeners[id];
        var code = [];
        for (var i = 0; i < funcs.length; i++) {
          var func = funcs[i];
          code.push("s."); // s.func(e);
          code.push(func.$name);
          code.push("(e);");
        }
        this.handlers[id] = new Function("s", "e", code.join(""));
      }
    },

    /**
     * called when a sprite is added to a group
     */
    onAdded : listener(EventAdded.ID, function(event) {
      this.parentGroup = event.group;
    }),

    /**
     * called when a sprite is removed from a group
     */
    onRemoved : listener(EventRemoved.ID, function(event) {
      this.parentGroup = null;
    })
  });
  Sprite.prototype.compile();
  module.Sprite = Sprite;

  /**
   * a group class. this contains other sprites
   */
  var Group = base.extend(Sprite, 'Group', {
    constructor : function() {
      this.constructor$Sprite();
      this.sprites = [];
      this.spriteDeltas = [];
      this.dirty = true;
    },

    /**
     * an array of sprites belonging to this group
     */
    sprites : null,
    
    /**
     * whether or not this groups sprites have been changed since the last
     * start of the tick
     */
    dirty : false,
    
    /**
     * changes to this group's sprites since the last refresh
     */
    spriteDeltas : null,

    /**
     * adds a sprite to this group
     */
    addSprite : function addSprite(sprite) {
      this.spriteDeltas.push({
        type : 0,
        sprite : sprite
      });
      this.dirty = true;
      World.instance.addDirtyGroup(this);
    },

    /**
     * removes a sprite from this group
     */
    removeSprite : function removeSprite(sprite) {
      var index = this.sprites.indexOf(sprite);
      if (index != -1) {
        this.spriteDeltas.push({
          type : 1,
          sprite : sprite
        });
        this.dirty = true;
        World.instance.addDirtyGroup(this);
      }
    },

    /**
     * a generator for getting this group's sprites. Made because of
     * SegmentedGroup
     */
    forEachSprite : function forEachSprite(func) {
      for (var i = 0; i < this.sprites.length; i++) {
        func(this.sprites[i]);
      }
    },

    /**
     * compiles handlers that pass on events to this group's sprites. This is
     * automatically called each tick if a group has changed
     */
    compilePassers : function compilePassers() {
      this.compile$Sprite();
      this.listeners = this.handlers;
      var handlers = {};
      
      var id;
      for (id in this.listeners) {
        handlers[id] = [ "var x;s.listeners[", id, "](s,e);" ];
      }

      for (var i = 0; i < this.sprites.length; i++) {
        var sprite = this.sprites[i];
        if (sprite instanceof Group) {
          if (sprite.dirty) {
            sprite.refresh();
          }
        }
        for (id in sprite.handlers) {
          if (typeof handlers[id] == 'undefined') {
            handlers[id] = [ "var x;" ];
          }
          handlers[id].push("x=s.sprites[");
          handlers[id].push(i);
          handlers[id].push("];x.handlers[");
          handlers[id].push(id);
          handlers[id].push("](x,e);");
        }
      }

      this.handlers = {};
      for (id in handlers) {
        this.handlers[id] = new Function("s", "e", (handlers[id].join("")));
      }
    },
    /**
     * applies any sprite changes to this group
     */
    refresh : function refresh() {
      for (var i = 0; i < this.spriteDeltas.length; i++) {
        var delta = this.spriteDeltas[i];
        if (delta.type === 0) {
          this.sprites.push(delta.sprite);
          delta.sprite.onEvent(new EventAdded(this));
        } else {
          this.sprites.splice(this.sprites.indexOf(delta.sprite), 1);
          delta.sprite.onEvent(new EventRemoved(this));
        }
      }
      this.spriteDeltas = [];

      this.compilePassers();
      this.dirty = false;
      if (this.parentGroup !== null) {
        World.instance.addDirtyGroup(this.parentGroup);
      }
    }
  });

  module.Group = Group;

  /**
   * for really, really large groups This fixes the lag caused by large groups
   * getting compiled
   */
  var SegmentedGroup = base.extend(Group, 'SegmentedGroup', {
    constructor : function SegmentedGroup(expectedSprites) {
      this.constructor$Group();
      this.segmentSize = Math.sqrt(expectedSprites);
    },

    segmentSize : null,

    addSprite : function addSprite(sprite) {
      if (this.sprites.length === 0 || 
          this.sprites[this.sprites.length - 1].sprites.length >= this.segmentSize) {
        this.addSprite$Group(new Group());
      }
      this.sprites[this.sprites.length - 1].addSprite(sprite);
    },

    removeSprite : function removeSprite(sprite) {
      for (var i = 0; i < this.sprites.length; i++) {
        var sub = this.sprites[i];
        if (sub.sprites.indexOf(sprite) != -1) {
          sub.removeSprite(sprite);
          return;
        }
      }
    },

    forEachSprite : function forEachSprite(func) {
      for (var i = 0; i < this.sprites.length; i++) {
        this.sprites[i].forEachSprite(func);
      }
    }
  });
  module.SegmentedGroup = SegmentedGroup;

  /**
   * the thing that contains everything also responsible for interface
   * interaction via event posting
   */
  var World = base.extend(Group, 'World', {
    constructor : function World() {
      this.constructor$Group();
      this.dirtyGroups = [];
      this.inter = new Interface();
      this.tickCount = 0;

      World.instance = this;

      var self = this;
      var display = document.getElementById(module.DISPLAY_ID);

      base.addListener(display, "mousedown", function(event) {
        self.handleMouseDown(event);
      });
      base.addListener(display, "mousemove", function(event) {
        self.handleMouseMove(event);
      });
      base.addListener(display, "mouseup", function(event) {
        self.handleMouseUp(event);
      });
      base.addListener(display, "keydown", function(event) {
        self.handleKeyDown(event);
      });
      base.addListener(display, "keyup", function(event) {
        self.handleKeyUp(event);
      });
      base.addListener(display, "blur", function(event) {
        self.handleBlur(event);
      });
    },

    /**
     * whether or not the mouse is down
     */
    mouseDown : false,

    /**
     * groups whose children have changed
     */
    dirtyGroups : null,

    /**
     * the world's interface
     */
    inter : null,

    init : function init() {
      this.addSprite(this.inter);
    },

    /**
     * called when an error happens. can (and supposed to) be overriden
     */
    handleError : function handleError(error, event) {
    },

    addDirtyGroup : function addDirtyGroup(group) {
      if (this.dirtyGroups.indexOf(group) == -1) {
        this.dirtyGroups.push(group);
      }
    },

    /**
     * refreshs any handlers for dirty groups
     */
    refreshListeners : function refreshListeners() {
      for (var i = 0; i < this.dirtyGroups.length; i++) {
        this.dirtyGroups[i].refresh();
      }
      this.dirtyGroups = [];
    },

    /**
     * called each tick
     */
    tick : function tick() {
      this.refreshListeners();
      this.onEvent(new EventTick(this.tickCount++));
    },

    /**
     * called each render
     * 
     * @param context -
     *            the context of the display canvas
     */
    render : function render(context) {
      context.fillStyle = "#000000";
      context.fillRect(0, 0, context.canvas.width, context.canvas.height);
      this.onEvent(new EventRender(context));
    },

    /**
     * handles a mouse being pressed
     */
    handleMouseDown : function handleMouseDown(event) {
      if (isLeftButton(event.button)) {
        this.mouseDown = true;

        var x = event.clientX - document.getElementById(module.DISPLAY_ID).getBoundingClientRect().left;
        var y = event.clientY - document.getElementById(module.DISPLAY_ID).getBoundingClientRect().top;
        this.onEvent(new EventMouseDown(x, y));
      }
    },

    handleMouseMove : function handleMouseMove(event) {
      var x = event.clientX - document.getElementById(module.DISPLAY_ID).getBoundingClientRect().left;
      var y = event.clientY - document.getElementById(module.DISPLAY_ID).getBoundingClientRect().top;
      this.onEvent(new EventMouseMove(x, y));
    },

    /**
     * handles a mouse being unpressed
     */
    handleMouseUp : function handleMouseUp(event) {
      if (isLeftButton(event.button)) {
        this.mouseDown = false;
        
        var x = event.clientX - document.getElementById(module.DISPLAY_ID).getBoundingClientRect().left;
        var y = event.clientY - document.getElementById(module.DISPLAY_ID).getBoundingClientRect().top;
        this.onEvent(new EventMouseUp(x, y));
      }
    },

    /**
     * handles a key being pressed
     */
    handleKeyDown : function(event) {
      this.inter.onKeyDown(event);
      this.onEvent(new EventKeyDown(event.keyCode));
    },

    /**
     * handles a key being unpressed
     */
    handleKeyUp : function handleKeyUp(event) {
      this.inter.onKeyUp(event);
      this.onEvent(new EventKeyUp(event.keyCode));
    },

    /**
     * handles a lost focus
     */
    handleBlur : function handleBlur(event) {
      this.inter.onBlur(event);
    }
  });
  module.World = World;
  /**
   * the word instance
   */
  World.instance = null;

  /**
   * returns whether or not a mouse button is the left mouse button
   */
  function isLeftButton(button) {
    for (var i = 1; i < 9; i++) {
      if (navigator.appVersion.indexOf("rv:" + i) > -1) {
        return button == 1;
      }
    }
    return button === 0;
  }

  /**
   * a sprite that is just a static image on a screen
   */
  var SimpleGraphic = base.extend(Sprite, 'SimpleGraphic', {
    constructor : function(canvas, x, y) {
      Sprite.call(this);
      this.canvas = canvas;
      this.x = x;
      this.y = y;
    },

    canvas : null,
    x : null,
    y : null,

    render : listener(EventRender.ID, function render(event) {
      event.context.drawImage(this.getCanvas(), this.getX(), this.getY());
    }),

    /**
     * returns the canvas (aka the image)
     */
    getCanvas : function getCanvas() {
      return this.canvas;
    },

    /**
     * returns the x position relative to the upperleft corner of the screen
     */
    getX : function getX() {
      return this.x;
    },

    /**
     * returns the y position relative to the upperleft corner of the screen
     */
    getY : function() {
      return this.y;
    }
  });
  module.SimpleGraphic = SimpleGraphic;
  SimpleGraphic.prototype.compile(SimpleGraphic);

  /**
   * represents current interface attributes
   */
  var Interface = base.extend(Sprite, 'Interface', {
    constructor : function() {
      this.constructor$Sprite();
      this.mouseX = 0;
      this.mouseY = 0;
      this.pressedKeys = [];
    },

    /**
     * the mouse's current coordinates
     */
    mouseX : null,
    mouseY : null,

    /**
     * the keys that are currently pressed
     */
    pressedKeys : null,

    onMouseMove : listener(EventMouseMove.ID, function onMouseMove(event) {
      this.mouseX = event.x;
      this.mouseY = event.y;
    }),

    /**
     * called when a key is pressed
     */
    onKeyDown : function onKeyDown(event) {
      if (this.pressedKeys.indexOf(event.keyCode) == -1) {
        this.pressedKeys.push(event.keyCode);
      }
    },

    /**
     * called when a key is unpressed
     */
    onKeyUp : function onKeyUp(event) {
      if (this.pressedKeys.indexOf(event.keyCode) != -1) {
        this.pressedKeys.splice(this.pressedKeys.indexOf(event.keyCode), 1);
      }
    },

    /**
     * called when the canvas loses it's focus
     */
    onBlur : function(event) {
      this.pressedKeys = [];
    },

    /**
     * called each tick
     */
    onTick : listener(EventTick.ID, function onTick(event) {
      for (var i = 0; i < this.pressedKeys.length; i++) {
        this.parentGroup.onEvent(new EventKeyPressed(this.pressedKeys[i]));
      }
    })
  });
  module.Interface = Interface;
  Interface.prototype.compile();

  /**
   * called each tick
   */
  module.tick = function() {
    World.instance.tick();
    World.instance.render(document.getElementById(module.DISPLAY_ID).getContext("2d"));
  };
});