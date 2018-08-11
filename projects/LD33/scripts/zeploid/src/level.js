/**
 * a gridded level module
 */
base.registerModule('level', function(module) {
  var engine = base.importModule('engine');
  var entity = base.importModule('entity');
  var util = base.importModule('util');
  var data = null;
  module.init = function init() {
    data = base.importModule('data');
  };

  /**
   * the heximal characters. Used for heximal conversions
   */
  const HEX_CHARS = '0123456789ABCDEF';
  module.HEX_CHARS = HEX_CHARS;

  /**
   * an interface that provides data
   */
  var tileProvider = {
    constructor : base.abstractMethod,
    /**
     * converts tile ids to tile objects
     * 
     * @param id
     *            the id of the tile
     * @return the tile associated with the id
     */
    getTile : base.abstractMethod,
    /**
     * a name to tile binding
     */
    tiles : base.abstractField,
    /**
     * the size of a tile, in pixels
     */
    tileSize : base.abstractField
  };
  module.tileProvider = tileProvider;
  module.setTileProvider = function setTileProvider(provider) {
    module.tileProvider = provider;
    tileProvider = provider;
  };

  data = base.importModule('data');

  /**
   * something that is in a grid
   */
  Grid = base.extend(Object, 'Grid', {
    constructor : base.abstractMethod,
    /**
     * gets the tile at a specified location
     * 
     * @param x
     *            the x position of the tile
     * @param y
     *            the y position of the tile
     */
    getTile : base.abstractMethod,
    /**
     * sets the tile at a specified location
     * 
     * @param tile
     *            the tile to set
     * @param x
     *            the x position of the tile
     * @param y
     *            the y position of the tile
     */
    setTile : base.abstractMethod
  });
  module.Grid = Grid;

  /**
   * a thing that holds part of the world
   */
  Chunk = base.extend([ engine.Sprite, Grid ], "Chunk", {
    constructor : function() {
      this.constructor$Sprite();
      this.tiles = null; // an typed array representing tiles
      this.image = null; // the baked image
      this.spawners = []; // the entities in this chunk
      this.entityTypes = {}; // objects defined in tmx files
    },
    getTile : function getTile(x, y) {
      return tileProvider.getTile(this.tiles[this.getIndex(x, y)]);
    },
    setTile : function setTile(tile, x, y) {
      this.tiles[this.getIndex(x, y)] = tile.id;
    },
    /**
     * gets the index in the tiles array for the given coordinate
     * 
     * @param x
     *            the x coordinate of the tile
     * @param y
     *            the y coordinate of the tile
     */
    getIndex : function getIndex(x, y) {
      return y * this.width + x;
    },
    /**
     * bakes the image for this chunk (a visual representation that is
     * displayed)
     */
    bakeImage : function bakeImage() {
      var tileSize = tileProvider.tileSize;
      this.image = engine.makeCanvas(tileSize * this.width, tileSize * this.height);
      var context = this.image.getContext("2d");

      var index = 0;
      for (var y = 0; y < this.height; y++) {
        for (var x = 0; x < this.width; x++) {
          var tile = tileProvider.getTile(this.tiles[index++]);
          if (tile.image !== null) {
            context.drawImage(tile.image, x * tileSize, y * tileSize);
          }
        }
      }
    },
    /**
     * renders the chunk by drawing it to the screen
     */
    render : engine.listener(engine.EventRender.ID, function render(event) {
      event.context.drawImage(this.image, 0, 0);
    }),
    /**
     * initialize this chunk so it has the data of the json object
     * 
     * @param obj
     *            the serialized data of this chunk
     */
    read : function read(obj) {
      this.width = obj.width; // reading dimensions
      this.height = obj.height;
      
      for(var i=0; i<obj.layers.length; i++) {
        var layer = obj.layers[i];
        if(layer.type == "tilelayer") {
          this.readTiles(layer);
        } else if (layer.type == "objectgroup") {
          for(var k=0; k<layer.objects.length; k++) {
            this.spawners.push(layer.objects[k]);
          }
        }
      }
    },
    
    readTiles : function readTiles(layer) {
      // reset the tile array
      this.tiles = new Uint8Array(this.width * this.height);
      var i = 0;

      for (var y = 0; y < this.height; y++) { // reading tiles
        for (var x = 0; x < this.width; x++) {
          var id = layer.data[i];
          this.tiles[i++] = id;
        }
      }

      this.bakeImage();
    },
    /**
     * returns whether or not this level should turn spawner tiles into
     * entities
     */
    hasEntities : function hasEntities() {
      return true;
    },
    /**
     * copies a chunk from another chunk
     */
     copyFrom : function copyFrom(other) {
       this.width = other.width;
       this.height = other.height;
       this.tiles = other.tiles;
       this.spawners = other.spawners;
       this.image = other.image;
     }
  });
  Chunk.prototype.compile();
  module.Chunk = Chunk;

  /**
   * a tile, or a grid square
   */
  Tile = base.extend(Object, 'Tile', {
    /**
     * the constructor
     * 
     * @param id
     *            the unique numerical id for this tile
     * @param texture
     *            the texture for the tile or null if there is none
     */
    constructor : function(id, texture) {
      this.id = id;
      this.image = texture;
    },
    /**
     * generates the bounding box for the tile in the given coordinates.
     * Useful for collisions
     * 
     * @param x
     *            the x position of the tile
     * @param y
     *            the y position of the tile
     * @return an util.Rect instance representing the bounding box or null
     *         if there is none
     */
    getBox : function getBox(x, y) {
      return new util.Rect(x, y, 1, 1);
    },
    /**
     * returns whether or not this tile is solid
     */
    isSolid : function isSolid() {
      return true;
    }
  });
  module.Tile = Tile;

  /**
   * a tile that can be passed through
   */
  module.PassableTile = base.extend(Tile, 'PassableTile', {
    constructor : function(id, texture) {
      this.constructor$Tile(id, texture);
    },
    getBox : function getBox(x, y) {
      return null;
    },
    isSolid : function isSolid() {
      return false;
    }
  });
});