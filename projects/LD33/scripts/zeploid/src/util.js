/**
 * random utilities
 */
base.registerModule('util', function(module) {
  function invalidNum(num) {
    return isNaN(num) || num == Number.POSITIVE_INFINITY || num == Number.NEGATIVE_INFINITY;
  }
  module.invalidNum = invalidNum;

  /**
   * keeps on printing how long a function took to execute
   */
  module.trace = function trace(name, func) {
    return function() {
      var start = new Date().getTime();
      func.apply(this, arguments);
      var end = new Date().getTime();
      console.log("function '" + name + "' took" + (end - start) / 1000 + "seconds");
    };
  };
  
  function equals(x, y) {
    if(x instanceof Array && y instanceof Array) {
      if(x.length == y.length) {
        for(var i=0; i<x.length; i++) {
          if(!equals(x[i], y[i])) {
            return false;
          }
        }
        return true;
      }
    }
    return x == y;
  }
  
  /**
   * returns a random item in a list
   */
  module.randChoice = function randChoice(list) {
    for(var i=0; i<10; i++) {
      console.log(randInt(0, list.length));
    }
    return list[randInt(0, list.length-1)];
  };
  
  /**
   * return a random number between x and y inclusive. x must be the lower of
   * the two
   */
  function randInt(x, y) {
    return Math.floor(Math.random() * (y - x + 1)) + x;
  }
  module.randInt = randInt;

  /**
   * returns a random angle in degrees
   */
  module.randDegree = function randDegree() {
    return util.randInt(0, 359);
  };
  
  /**
   * returns a shallow copy of an Array or array like object
   */
  module.copyArray = function copyArray(array) {
    var make = [];
    for(var i=0; i<array.length; i++) {
      make[i] = array[i];
    }
    return make;
  };

  /**
   * a vector. like in normal math. The arguments are the vector's components.
   * If the no arguments are specified, both components are null.
   */
  var Vector = base.extend(Object, 'Vector', {
    constructor : function Vector(x, y) {
      this.init(x, y);
    },

    /**
     * internally used properties set these to prevent updating other
     * attributes If you set _x or _y, when you're done call updateMd If you
     * set _m or _d, when you're done call updateXy
     */
    _x : null,
    _y : null,
    _m : null,
    _d : null,

    init : function init(x, y) {
      this.live = true;
      if (typeof x != 'undefined') {
        this._x = x;
        this._y = y;
        this.updateMd();
      }
    },

    /**
     * updates the magnitude and direction. Called when x or y is changed
     */
    updateMd : function updateMd() {
      var x = this._x;
      var y = this._y;
      this._m = Math.sqrt(x * x + y * y);
      this._d = Math.atan2(y, x) * RADIAN_TO_DEGREE; // thanks to
      // http://stackoverflow.com/questions/9614109/how-to-calculate-an-angle-from-points
    },

    /**
     * updates the x and y components. Called when m or d is changed
     */
    updateXy : function updateXy() {
      this._x = Math.cos(this.d * DEGREE_TO_RADIAN) * this.m;
      this._y = Math.sin(this.d * DEGREE_TO_RADIAN) * this.m;
    },

    /**
     * adds a vector to another
     * 
     * @param other -
     *            the other operand
     * @returns the product
     */
    add : function add(other) {
      return Vector.get(this.x + other.x, this.y + other.y);
    },

    /**
     * subtracts a vector from another
     * 
     * @param other -
     *            the right operand
     * @returns the difference
     */
    sub : function sub(other) {
      return Vector.get(this.x - other.x, this.y - other.y);
    },

    /**
     * returns the opposite of this vector
     * 
     * @returns {Vector}
     */
    opposite : function opposite() {
      return Vector.get(-this.x, -this.y);
    },

    /**
     * adds this vector to another and stores the result in this vector
     * 
     * @param other -
     *            the vector to increment by
     */
    increment : function increment(other) {
      this.x += other.x;
      this.y += other.y;
    },

    scale : function scale(scale) {
      return Vector.get(this.x * scale, this.y * scale);
    },

    toString : function() {
      return "{x: " + this.x + ", y: " + this.y + ", m: " + this.m + ", d: " + this.d + "}";
    }
  });
  module.Vector = Vector;

  /**
   * first vector in the pool stack
   */
  Vector.firstPool = null;

  /**
   * returns a vector in the pool stack or creates a new one if needed
   */
  Vector.get = function get(x, y) {
    if (Vector.firstPool === null) {
      return new Vector(x, y);
    }
    var vector = Vector.firstPool;
    Vector.firstPool = vector.x;

    vector.init(x, y);
    return vector;
  };

  /**
   * recycles a vector and puts it in the pool
   */
  Vector.recycle = function recycle(vector) {
    if (!vector.live) {
      throw (new Error("attempt to recycle a vector twice"));
    }
    vector.live = false;
    vector.x = Vector.firstPool;
    vector.live = false; // trying to get errors to occur if you're using
    // a recycled vector
    Vector.firstPool = vector;
  };

  /**
   * creates a vector from magnitude and direction instead of its components
   * 
   * @param m
   *            the magnitude
   * @param d
   *            the direction
   * @returns the vector
   */
  Vector.createMd = function createMd(m, d) {
    var vector = new Vector();
    vector.m = m;
    vector.d = d;
    return vector;
  };

  /**
   * the x and y components along with the magnitude and direction
   */
  Object.defineProperty(Vector.prototype, "x", {
    get : function() {
      return this._x;
    },
    set : function(v) {
      this._x = v;
      this.updateMd();
    }
  });
  Object.defineProperty(Vector.prototype, "y", {
    get : function() {
      return this._y;
    },
    set : function(v) {
      this._y = v;
      this.updateMd();
    }
  });
  Object.defineProperty(Vector.prototype, "m", {
    get : function() {
      return this._m;
    },
    set : function(v) {
      this._m = v;
      this.updateXy();
    }
  });
  Object.defineProperty(Vector.prototype, "d", {
    get : function() {
      return this._d;
    },
    set : function(v) {
      this._d = v;
      this.updateXy();
    }
  });

  const RADIAN_TO_DEGREE = 180 / Math.PI;
  const DEGREE_TO_RADIAN = 1 / RADIAN_TO_DEGREE;

  /**
   * a dictionary. allows non-string keys
   */
  Dictionary = base.extend(Object, 'Dictionary ', {
    constructor : function Dictionary() {
      this.entries = [];
    },

    /**
     * a list of entries
     */
    entries : null,

    /**
     * gets the value associated the key
     */
    get : function get(key) {
      return this.getEntry(key).value;
    },

    /**
     * returns whether or not a key is contained in this dictionary
     */
    contains : function contains(key) {
      return this.getEntry(key) !== null;
    },

    /**
     * associates a key with a value
     */
    put : function put(key, value) {
      var entry = this.getEntry(key);
      if (entry === null) {
        entry = new Entry(key, value);
        this.entries.push(entry);
      } else {
        entry.value = value;
      }
    },

    /**
     * returns how many entries are in this dictionary
     */
    length : function length() {
      return this.entries.length;
    },

    /**
     * returns the entry with the given key
     */
    getEntry : function getEntry(key) {
      for (var i = 0; i < this.entries.length; i++) {
        var entry = this.entries[i];
        if (equals(entry.key, key)) {
          return entry;
        }
      }
      return null;
    }
  });
  module.Dictionary = Dictionary;

  /**
   * an entry in a dictionary. used internally
   */
  var Entry = base.extend(Object, 'Entry', {
    constructor : function Entry(key, value) {
      this.key = key;
      this.value = value;
    },
  
    key : null,
    value : null
  });
  
    /**
   * a simple rectangle class TODO move into the util module
   */
  var Rect = base.extend(Object, 'Rect', {
    constructor : function(left, top, width, height) {
      this.left = left;
      this.top = top;
      this.width = width;
      this.height = height;
    },

    /**
     * distance from the y-axis to the left of this rectangle
     */
    left : null,
    /**
     * distance from the x-axis to the top of this rectangle
     */
    top : null,
    /**
     * width of this rectangle
     */
    width : null,
    /**
     * height of this rectangle
     */
    height : null,

    /**
     * returns if a point is contained inside this rectangle
     * 
     * @param x -
     *            the x of the point
     * @param y -
     *            the y of the point
     */
    collidepoint : function collidepoint(x, y) {
      return this.left < x && this.top < y && x < this.right && y < this.bottom;
    },

    /**
     * returns if this rectangle overlaps another. it is better for
     * performance if the smaller one is the argument and the larger one is
     * 'this'
     * 
     * @param other -
     *            the other rectangle
     * @returns
     */
    colliderect : function colliderect(other) {
      // from
      // https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
      return this.left < other.right && this.right > other.left && this.top < other.bottom
          && this.bottom > other.top;
    }
  });
  module.Rect = Rect;
  
  /**
   * internally used
   */
  function registerRectProp(name, func_get) {
    Object.defineProperty(Rect.prototype, name, {
      get : func_get
    });
  }

  /**
   * distance from the x-axis to the right of this rectangle
   */
  registerRectProp("right", function() {
    return this.left + this.width;
  });
  /**
   * distance from the y-axis to the bottom of this rectangle
   */
  registerRectProp("bottom", function() {
    return this.top + this.height;
  });
});