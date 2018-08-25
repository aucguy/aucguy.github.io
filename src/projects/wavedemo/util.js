/**
 * random utilities
 */
base.registerModule('util', function(module) {
	function invalidNum(num) {
		return isNaN(num) || num == Number.POSITIVE_INFINITY
				|| num == Number.NEGATIVE_INFINITY;
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
			console.log("function '" + name + "' took" + (end - start) / 1000
					+ "seconds");
		};
	};

	/**
	 * a vector. like in normal math. The arguments are the vector's components.
	 * If the no arguments are specified, both components are null.
	 */
	var Vector = oldextend(Object, function Vector(x, y) {
		this.init(x, y);
	});

	Vector.prototype.init = function(x, y) {
		this.live = true;
		if (typeof x != 'undefined') {
			this._x = x;
			this._y = y;
			this.updateMd();
		}
	};
	module.Vector = Vector;

	/**
	 * first vector in the pool stack
	 */
	Vector.firstPool = null;

	/**
	 * returns a vector in the pool stack or creates a new one if needed
	 */
	Vector.get = function get(x, y) {
		return new Vector(x, y); // just a teset
		if (Vector.firstPool == null) {
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
	Vector.prototype.recycle = function recycle() {
		if (!this.live) {
			throw (new Error("attempt to recycle a vector twice"));
		}
		this.live = false
		this.x = Vector.firstPool;
		this.live = false; // trying to get errors to occur if you're using a
							// recycled vector
		Vector.firstPool = this;
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
	 * internally used properties set these to prevent updating other attributes
	 * If you set _x or _y, when you're done call updateMd If you set _m or _d,
	 * when you're done call updateXy
	 */
	Vector.prototype._x = null;
	Vector.prototype._y = null;
	Vector.prototype._m = null;
	Vector.prototype._d = null;

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

	const
	RADIAN_TO_DEGREE = 180 / Math.PI;
	const
	DEGREE_TO_RADIAN = 1 / RADIAN_TO_DEGREE;

	/**
	 * updates the magnitude and direction. Called when x or y is changed
	 */
	Vector.prototype.updateMd = function updateMd() {
		var x = this._x;
		var y = this._y;
		this._m = Math.sqrt(x * x + y * y);
		this._d = Math.atan2(y, x) * RADIAN_TO_DEGREE; // thanks to
														// http://stackoverflow.com/questions/9614109/how-to-calculate-an-angle-from-points
	};

	/**
	 * updates the x and y components. Called when m or d is changed
	 */
	Vector.prototype.updateXy = function updateXy() {
		this._x = Math.cos(this.d * DEGREE_TO_RADIAN) * this.m;
		this._y = Math.sin(this.d * DEGREE_TO_RADIAN) * this.m;
	};

	/**
	 * adds a vector to another
	 * 
	 * @param other -
	 *            the other operand
	 * @returns the product
	 */
	Vector.prototype.add = function add(other) {
		return Vector.get(this.x + other.x, this.y + other.y);
	};

	/**
	 * subtracts a vector from another
	 * 
	 * @param other -
	 *            the right operand
	 * @returns the difference
	 */
	Vector.prototype.sub = function sub(other) {
		return Vector.get(this.x - other.x, this.y - other.y);
	};

	/**
	 * returns the opposite of this vector
	 * 
	 * @returns {Vector}
	 */
	Vector.prototype.opposite = function opposite() {
		return Vector.get(-this.x, -this.y);
	};

	/**
	 * adds this vector to another and stores the result in this vector
	 * 
	 * @param other -
	 *            the vector to increment by
	 */
	Vector.prototype.increment = function increment(other) {
		this.x += other.x;
		this.y += other.y;
	};

	Vector.prototype.scale = function scale(scale) {
		return Vector.get(this.x * scale, this.y * scale);
	};

	Vector.prototype.toString = function() {
		return "{x: " + this.x + ", y: " + this.y + ", m: " + this.m + ", d: "
				+ this.d + "}";
	};
	
	/**
	 * copies this vector
	 */
	Vector.prototype.copy = function copy() {
		return Vector.get(this.x, this.y);
	}

	/**
	 * a dictionary. allows non-string keys
	 */
	Dictionary = oldextend(Object, function Dictionary() {
		this.entries = [];
	});
	module.Dictionary = Dictionary;
	/**
	 * a list of entries
	 */
	Dictionary.prototype.entries = null;

	/**
	 * gets the value associated the key
	 */
	Dictionary.prototype.get = function get(key) {
		return this.getEntry(key).value;
	};

	/**
	 * returns whether or not a key is contained in this dictionary
	 */
	Dictionary.prototype.contains = function contains(key) {
		return this.getEntry(key) != null;
	};

	/**
	 * associates a key with a value
	 */
	Dictionary.prototype.put = function put(key, value) {
		var entry = this.getEntry(key);
		if (entry == null) {
			entry = new Entry(key, value);
			this.entries.push(entry);
		} else {
			entry.value = value;
		}
	};

	/**
	 * returns how many entries are in this dictionary
	 */
	Dictionary.prototype.length = function length() {
		return this.entries.length;
	};

	/**
	 * returns the entry with the given key
	 */
	Dictionary.prototype.getEntry = function getEntry(key) {
		for (var i = 0; i < this.entries.length; i++) {
			var entry = this.entries[i];
			if (entry.key == key) {
				return entry;
			}
		}
		return null;
	};

	/**
	 * an entry in a dictionary. used internally
	 */
	var Entry = oldextend(Object, function Entry(key, value) {
		this.key = key;
		this.value = value;
	});
	Entry.prototype.key = null;
	Entry.prototype.value = null;

	/**
	 * return a random number between x and y inclusive. x must be the lower of
	 * the two
	 */
	util.randInt = function randInt(x, y) {
		return Math.random() * (y - x) + x;
	}

	/**
	 * returns a random angle in degrees
	 */
	util.randDegree = function randDegree() {
		return util.randInt(0, 359);
	}
});