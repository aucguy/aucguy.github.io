base.registerModule("main", function(module) {
	/**
	 * the display canvas
	 */
	var display;
	var DISPLAY_ID = "display";

	/**
	 * last time tick() was called
	 */
	var lastTime = 0;
	var paused = false;

	/**
	 * sets everything up
	 */
	function init() {
		display = document.getElementById(DISPLAY_ID);
		World.instance = new World("#F8F8F8");
		requestAnimationFrame(tick); // TODO make cross-browser compatible
		document.getElementById("sync-settings").addEventListener("click", external(function () {
			initWorld(World.instance, new Settings());
		}));
		window.addEventListener("blur", external(function() {
			paused = true;
		}));
		window.addEventListener("focus", external(function() {
			paused = false;
		}))
		initWorld(World.instance, new Settings());
	}
	
	function initWorld(world, settings) {
		world.sprites = [];
		
		var start = 25;
		var end = display.width - start;
		var incr = (end - start) / (settings.nodeCount + 2);
		var y = display.height / 2;
		var x = start;
		
		var nodeGroup = new Group();
		var connectionGroup = new Group();
		world.addSprite(connectionGroup);
		world.addSprite(nodeGroup);
		
		var nodes = [];
		var node = new MovingNode(util.Vector.get(x, y), settings.amplitude, settings.frequency);
		nodes.push(node); //the moving hand
		nodeGroup.addSprite(node);
		x += incr;
		
		for(var i=0; i<settings.nodeCount; i++) {
			node = new PhysicalNode(util.Vector.get(x, y), settings.friction / 100);
			nodes.push(node);
			nodeGroup.addSprite(node);
			x += incr;
		}
		
		node = new StaticNode(util.Vector.get(x, y));
		nodes.push(node); // the static hand
		nodeGroup.addSprite(node);
		
		for(var i=0; i<settings.nodeCount+1; i++) {
			var connection = new Connection(nodes[i], nodes[i + 1], settings.tension);
			connectionGroup.addSprite(connection);
			connection.bind();
		}
	}

	/**
	 * called each tick. Main ticking thing
	 */
	function tick() {
		if(paused) {
			time = 0;
		} else {
			var time = lastTime;
			lastTime = new Date().getTime() / 1000;
			if(time != 0) {
				var elapsedTime = lastTime - time;
				World.instance.update(Math.min(elapsedTime, 0.01));
			}
		}
		World.instance.render(display.getContext("2d"));
		requestAnimationFrame(tick);
	}

	/**
	 * Sprites are things that get updated which tick and get rendered
	 */
	var Sprite = extend(Object, "Sprite", {
		constructor : function(graphic) {
			this.position = util.Vector.get(); // sprite position
			this.graphic = graphic; // sprite visual as an image
			this.parent = null; // the group that contains this sprite
		},

		/**
		 * updates various attributes of the sprite
		 */
		update : function update(elapsedTime) {
		},

		/**
		 * renders the sprite to the screen
		 */
		render : function render(context) {
			context.drawImage(this.graphic, this.position.x, this.position.y);
		},

		/**
		 * called when this sprite is added to a group
		 */
		onAdded : function onAdded(group) {
			if (this.parent != null) {
				throw (new Error(
						"Sprite added to a group when it was already in one"));
			}
			this.parent = group;
		},

		/**
		 * called when this sprite is removed from a group
		 */
		onRemoved : function onRemoved(group) {
			if (this.parent != group) {
				throw (new Error("Sprite removed from a group it wasn't in"));
			}
			this.parent = null;
		}
	});
	
	/**
	 * A group is a sprite that contains other sprites. Useful for grouping
	 * sprites together
	 */
	var Group = extend(Sprite, "Group", {
		constructor : function() {
			this.constructor$Sprite();
			this.sprites = []; // an array of sprites this group contains
		},

		update : function update(elapsedTime) {
			for (var i = 0; i < this.sprites.length; i++) {
				this.sprites[i].update(elapsedTime);
			}
		},

		render : function render(context) {
			for (var i = 0; i < this.sprites.length; i++) {
				this.sprites[i].render(context);
			}
		},

		/**
		 * adds a sprite to this group
		 */
		addSprite : function addSprite(sprite) {
			this.sprites.push(sprite);
			sprite.onAdded(this);
		},

		/**
		 * removes a sprite from this group
		 */
		removeSprite : function removeSprite(sprite) {
			this.sprites.splice(this.sprites.indexOf(sprite), 1);
			sprite.onRemoved(this);
		}
	});

	/**
	 * the World. Contains the everything
	 */
	var World = extend(Group, "World", {
		constructor : function(background) {
			this.constructor$Group();
			this.backgroundColor = background;
		},	
		render : function(context) {
			context.fillStyle = this.backgroundColor;
			context.fillRect(0, 0, context.canvas.width, context.canvas.height);
			this.render$Group(context);
		}
	});

	/**
	 * the nodes the string is made of
	 */
	var Node = extend(Sprite, "Node", {
		constructor : function(position) {
			this.constructor$Sprite();
			this.position = position;
			this.velocity = util.Vector.get(0, 0);
			this.connections = []; //nodes this node connects to
		},
		update : function update(elapsedTime) {
			this.update$Sprite(elapsedTime);
			this.velocity.increment(this.getAcceleration());
			var tmp = this.velocity.copy();
			tmp.m *= elapsedTime;
			this.position.increment(tmp);
		},
		render : function render(context) {
			context.fillStyle = "#000000";
			context.fillRect(this.position.x, this.position.y, 10, 10);
		},
		
		/**
		 * abstract method. return the acceleration on this node
		 */
		getAcceleration : function getAcceleration() {
			throw new Error("Abstract Method");
		}
	});
	
	/**
	 * a node that is pulled by other nodes
	 */
	var PhysicalNode = extend(Node, "PhysicalNode", {
		constructor : function(position, friction) {
			this.constructor$Node(position);
			this.mass = 1;
			this.friction = friction;
		},
	
		getAcceleration : function getAcceleration() {
			var accel = util.Vector.get(0, 0);
			for(var i=0; i<this.connections.length; i++) {
				accel.increment(this.connections[i].getForce(this));
			}
			accel.m /= this.mass;
			return accel;
		},
		
		update : function update(elapsedTime) {
			this.update$Node(elapsedTime);
			this.velocity.m -= this.friction;
		}
	});
	
	/**
	 * the node that moves up and down
	 */
	var MovingNode = extend(Node, "MovingNode", {
		constructor : function(position, amplitude, frequency) {
			this.constructor$Node(position);
			this.amplitude = amplitude;
			this.frequency = frequency;
			this.time = 0;
		},
		
		getAcceleration : function getAcceleration() {
			return util.Vector.get(0, 0);
		},
		
		update : function update(elapsedTime) {
			this.update$Node(elapsedTime);
			this.time += elapsedTime;
			this.position.y = Math.floor(Math.sin(this.time * this.frequency / 25) * this.amplitude) + 
				display.height / 2;
		},
	});
	
	/**
	 * a node that doesn't move
	 */
	var StaticNode = extend(Node, "StaticNode", {
		constructor : function(position) {
			this.constructor$Node(position);
		},
		
		getAcceleration : function getAcceleration() {
			return util.Vector.get(0, 0);
		}
	});
	
	/**
	 * represents a connection between nodes
	 */
	var Connection = extend(Sprite, "Connection", {
		constructor : function(nodeA, nodeB, strength) {
			this.nodeA = nodeA; //first node
			this.nodeB = nodeB; //second node
			this.strength = strength; //the 'strength' of the connection (ie k in a spring)
			this.force = null; //force applied on nodeA
		},
	
		/**
		 * binds the two nodes together
		 */
		bind : function bind() {
			this.give(this.nodeA);
			this.give(this.nodeB);
		},
		
		give : function give(node) {
			if(node.connections.indexOf(this) == -1) {
				node.connections.push(this);
			}
		},
		
		/**
		 * returns the force vector applied on the given node
		 */
		getForce : function(node) {
			if(node == this.nodeA) {
				return this.force;
			} else if(node == this.nodeB) {
				return this.force.opposite();
			}
			return null;
		},
		
		/**
		 * renders a connection
		 */
		render : function render(context) {
			var red
			
			context.strokeStyle = "#FF0000";
			context.beginPath();
			context.moveTo(this.nodeA.position.x+5, this.nodeA.position.y+5);
			context.lineTo(this.nodeB.position.x+5, this.nodeB.position.y+5);
			context.stroke();
		},
		
		update : function update(elapsedTime) {
			this.force = this.nodeB.position.sub(this.nodeA.position);
			this.force.m *= this.strength * elapsedTime;
		}
	});
	
	/**
	 * represents the current world settings
	 */
	Settings = extend(Object, "Settings", {
		constructor: function() {
			this.nodeCount = safeParseInt(document.getElementById("nodeCount").value);
			this.frequency = safeParseInt(document.getElementById("frequency").value);
			this.amplitude = safeParseInt(document.getElementById("amplitude").value);
			this.tension = document.getElementById("tension").value;
			this.friction = document.getElementById("friction").value;
		}
	});

	/**
	 * the instance of the world
	 */
	World.instance = null;

	init();
});