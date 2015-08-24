/**
 * handles entities in the world (things that move around)
 */
base.registerModule('entity', function(module) {
  var run = base.importModule('run');
  var engine = base.importModule('engine');
  var util = base.importModule('util');
  var level = base.importModule('level');
  var visual = base.importModule('visual');
  var data = base.importModule('data');
  
  /**
   * axis enums.
   */
  var AXIS = {
    X : 0,
    Y : 1
  };

  /**
   * direction enum
   */
  var DIRECTION = {
    LEFT : 0,
    RIGHT : 1
  };
  
  var COLLISION_TYPE = {
    NONE : 0,
    PUSH_ME : 1,
    PUSH_OTHER : 2
  };
  
  /**
   * provides data about physical constants
   */
  var physicsProvider = {
    GRAVITY: base.abstractField,
    AIR_RESISTANCE: base.abstractField,
    FLOOR_FRICTION: base.abstractField,
    HORZ_SPEED: base.abstractField,
    VERT_SPEED: base.abstractField
  };
  module.physicsProvider = physicsProvider;
  module.setPhysicsProvider = function setPhysicsProvider(provider) {
    physicsProvider = provider;
    module.physicsProvider = provider;
  };
  
  /**
   * something that is in the world
   */
  var Entity = base.extend(engine.Sprite, 'Entity', {
    /**
     * entity constructor
     * 
     * @param world
     *            the world the entity is in
     * @param position
     *            the entity's initial position
     * @param clip
     *            the box clip
     * @param tileProvider the tile data provider
     * @param graphicProvider the graphics data provider
     */
    constructor : function(world, position, clip) {
      this.world = world;
      this.position = position;
      this.clip = clip;
    },

    /**
     * generates the entity's bounding box
     * TODO change the clip
     * 
     * @return the entity's bounding box
     */
    getBox : function getBox() {
      return new util.Rect(this.position.x, this.position.y, this.clip[0],
          this.clip[1]);
    },

    /**
     * renders the entity
     * 
     * @param context
     *            the rendering context
     * @param graphic
     *            the canvas to draw with
     */
    renderWithImage : function renderWithImage(context, graphic) {
      var renderVector = this.getRenderVector();
      var tileSize = level.tileProvider.tileSize;
      context.drawImage(graphic, renderVector.x * tileSize, 
          renderVector.y * tileSize);
    },
    /**
     * returns the entity's location on the screen
     */
    getRenderVector : function getRenderVector() {
      var renderBounds = this.world.getRenderBounds();
      return util.Vector.get(this.position.x, this.position.y).sub(
          util.Vector.get(renderBounds.left, renderBounds.top));
    }
  });
  Entity.prototype.compile();

  /**
   * an entity that moves around in the world
   */
  var Mob = base.extend(Entity, 'Mob', {
    /**
     * Mob constructor
     * 
     * @param world
     *            the world the mob is in
     * @param position
     *            the initial position
     * @param graphic
     *            the graphics object
     */
    constructor : function Mob(world, position, graphic, clip) {
      this.constructor$Entity(world, position, clip);
      this.velocity = util.Vector.get(0, 0);
      this.graphic = graphic;
      this.onGround = false; // whether or not the mob is touching the
      // ground
      this.timeOnGroundAndMoving = 0; // how many ticks the mob has
      // been on the ground and has been moving
      this.direction = DIRECTION.LEFT; // last direction of movement
      this.speed = physicsProvider.HORZ_SPEED;
      this.jumpSpeed = physicsProvider.VERT_SPEED;
    },
    /**
     * updates the mob and simulates physics
     * TODO create physics data provider
     */
    update : engine.listener(engine.EventTick.ID, function update(event) {
      this.velocity.y += physicsProvider.GRAVITY; // apply gravity
      this.velocity = this.velocity.scale(physicsProvider.AIR_RESISTANCE);
      this.onGround = false; // reset flag (will get set to true if the
      // entity collides with ground)

      /*
       * moves along one axis at a time and then checks for collisions
       * after each axis. If a collision is found then the mob had just
       * collided with something due to that movement along that axis.
       * Thus, the mob knows to move back along the same axis so it isn't
       * overlapping with something else
       */
      this.position.x += this.velocity.x;
      this.handlePhysics(AXIS.X, event.tickCount);
      this.position.y += this.velocity.y;
      this.handlePhysics(AXIS.Y, event.tickCount);

      if (this.onGround && this.velocity.x !== 0) {
        this.timeOnGroundAndMoving++;
      }
      if (this.velocity.x < 0) {
        this.direction = DIRECTION.LEFT;
      } else if (this.velocity.x > 0) {
        this.direction = DIRECTION.RIGHT;
      }
    }),

    /**
     * checks for collisions and 'uncollides' if the mob finds any
     * 
     * @param axis
     *            the axis the mob just moved along (AXIS.X or AXIS.Y)
     */
    handlePhysics : function handleCollision(axis) {
      var bounds = this.getBox(); // bounds of mob
      var roundedX = Math.round(this.position.x);
      var roundedY = Math.round(this.position.y);
      var box;
      
      // check for tiles around the mob
      for (var x = roundedX - 1; x <= roundedX + 1; x++) {
        for (var y = roundedY - 1; y <= roundedY + 1; y++) {
          var tile = this.world.getTile(x, y);
          if (tile === null) {
            continue;
          }
          box = tile.getBox(x, y); // box of tile
          if (tile.isSolid() && box !== null) {
            if (bounds.colliderect(box)) {
              this.handleCollision(bounds, box, axis); // 'uncollide'
              return;
            }
          }
        }
      }
    },

    /**
     * moves the mob so it doesn't collide with a tile. AKA handles a
     * collision
     * 
     * @param bounds
     *            the bounds of the mob
     * @param box
     *            the bounds of the tile
     * @param axis
     *            the axis the mob moved along. So this is the same axis the
     *            mob should along so it doesn't overlap with the tile
     */
    handleCollision : function handlePhysics(bounds, box, axis) {
      if (axis == AXIS.X) { // in x direction
        if (this.velocity.x < 0) { // left side of mob into right side
          // of tile
          this.position.x = box.right;
        } else { // right side of mob into left side of tile
          this.position.x = box.left - bounds.width;
        }
        this.velocity.x = 0;
      } else { // in y direction
        if (this.velocity.y < 0) { // top side of mob into bottom side
          // of tile
          this.position.y = box.bottom;
        } else { // bottom side of mob into top side of tile
          this.position.y = box.top - bounds.height;
          this.onGround = true;
          this.velocity.x *= physicsProvider.FLOOR_FRICTION; // friction
          // against floor
        }
        this.velocity.y = 0;
      }
    },

    /**
     * renders the mob
     */
    render : engine.listener(engine.EventRender.ID, function render(event) {
      var index = Math.round(this.timeOnGroundAndMoving / 1000 % (this.graphic.left.length - 1));
      var graphic;
      if (this.direction == DIRECTION.LEFT) {
        graphic = this.graphic.left[index];
      } else {
        graphic = this.graphic.right[index];
      }

      this.renderWithImage(event.context, graphic);
    }),
    /**
     * move left, right, or jumps
     */
    moveLeft : function moveLeft(speed) {
      this.velocity.x = -speed;
    },
    moveRight : function moveRight(speed) {
      this.velocity.x = speed;
    },
    moveUp : function moveUp(speed) {
      if (this.onGround) {
        this.velocity.y = -speed;
      }
    },
    getCollisionPrecedence : function getCollisionPrecedence() {
      return 0;
    }
  });
  module.Mob = Mob;
  Mob.prototype.compile();

  /**
   * the player
   */
  module.Player = base.extend(Mob, 'Player', {
    constructor : function Player(world, position, clip) {
      this.constructor$Mob(world, position, visual.graphicsProvider.textures.PLAYER, 
          clip);
    },
    /**
     * returns the player's location on the screen
     */
    getRenderVector : function getRenderVector() {
      var tileSize = level.tileProvider.tileSize;
      return util.Vector.get(run.SCREEN_WIDTH / tileSize / 2, 
          run.SCREEN_HEIGHT / tileSize / 2);
    },
    /**
     * move left, right, or jumps
     */
    moveLeft : engine.listener(engine.EventKeyPressed.ID_A, function moveLeft(event) {
      this.moveLeft$Mob(this.speed);
    }),
    moveRight : engine.listener(engine.EventKeyPressed.ID_D, function moveRight(event) {
      this.moveRight$Mob(this.speed);
    }),
    moveUp : engine.listener(engine.EventKeyPressed.ID_W, function moveUp(event) {
      this.moveUp$Mob(this.jumpSpeed);
    }),
    getCollisionPrecedence : function getCollisionPrecedence() {
      return 1;
    }
  });
  module.Player.prototype.compile();

  /**
   * a collectable entity
   */
  var Collectable = base.extend(Entity, 'Collectable', {
    constructor : function Collectable(world, position, graphic, clip) {
      this.constructor$Entity(world, position, clip);
      this.graphic = graphic;
    },
    render : engine.listener(engine.EventRender.ID, function render(event) {
      this.renderWithImage(event.context, this.graphic);
    })
  });
  module.Collectable = Collectable;
  Collectable.prototype.compile();
});