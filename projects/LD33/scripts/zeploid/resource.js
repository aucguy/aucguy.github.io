/**
 * handles loading assets
 */
base.registerModule('resource', function(module) {
  /**
   * a path to resource binding of loaded resources
   */
  var resources = {};
  /**
   * the path that contains resources
   */
  var resource_path = null;
  /**
   * how many resources are being loaded
   */
  var loading = 0;
  
  /**
   * initializes the module
   */
  function init() {
    base.onModuleRegistered = function() {
      loading--;
    };
  }
  
  /**
   * sets the resource path
   */
  function setResourcePath(path) {
    resource_path = path;
  }
  module.setResourcePath = setResourcePath;

  /**
   * gets the resource path
   */
  module.getResourcePath = function(path) {
    return resource_path;
  };

  /**
   * returns how many resources are being loaded
   */
  module.getLoading = function() {
    return loading;
  };

  /**
   * load a resource
   * @param asset
   *          the path to the asset to load
   * @param handle 
   *          translates the file data into an actually asset object 
   * @param onread
   *          called when the requested resource is ready to be used
   */
  function loadResource(id, url, handle, onready) {
    loading++;
    module.ajax(join(resource_path, url), function(request) {
      try {
        var resource = handle(request.responseText);
        resources[id] = resource;
        if (onready !== null) {
          onready(resource, id, url);
        }
        loading--;
      } catch (error) {
        loading--;
        throw error;
      }
    }, function(request) {
      loading--;
      throw new Error("failed to retrieve asset " + id);
    });
  }
  module.loadResource = loadResource;

  /**
   * returns a loaded resource with the given path
   */
  module.getResource = function(asset) {
    return resources[asset];
  };

  /**
   * loads json data
   */
  module.loadJson = function loadJson(id, url, resource, callback) {
    loadResource(id, url, function(text) {
      return JSON.parse(text);
    }, callback);
  };

  /**
   * loads an image
   */
  module.loadImage = function loadImage(id, url, resource, callback) {
    loading++;
    var image = new Image();
    image.onload = function() {
      resources[id] = image;
      if(callback !== null) {
        callback(image, id, url);
      }
      loading--;
    };
    image.src = url;
  };
  
  /**
   * loads a script. Note the callback doesn't get called
   */
  module.loadScript = function loadScript(id, url, resource, callback) {
    loading++;
    var element = document.createElement("script");
    element.src = url;
    document.head.appendChild(element);
    resources[id] = element;
  };
  
  /**
   * handle for loading xml data
   */
  module.loadXml = function loadXml(id, url, resource, callback) {
    loadResource(id, url, function(text) {
      var xml = base.importModule('xml');
      return xml.parseXml(text);
    }, callback);
  };
  
  var loaders = {
    json : module.loadJson,
    image : module.loadImage,
    script : module.loadScript,
    xml : module.loadXml
  };


  /**
   * handle for loading svgs
   * 
   * module.loadSvg = function loadSvg(text) { var dom = xml.parseXml(text);
   * xml.removeMetadata(dom); var svg = dom.getElementsByTagName("svg")[0];
   * var canvas = engine.makeCanvas(safeParseInt(svg.getAttribute("width")),
   * safeParseInt(svg.getAttribute("height")));
   * canvas.getContext("2d").drawSvg(dom); return canvas; };
   */

  /**
   * sends a request to the server for the given resource
   */
  function ajax(path, onready, onfail) {
    if (typeof onfail == 'undefined') {
      onfail = function(request) {
        console.warn("resource " + path + " failed to load with a status of " + request.status);
      };
    }

    // taken from
    // http://www.w3schools.com/ajax/tryit.asp?filename=tryajax_first
    // and modified
    var request;
    if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera,
      // Safari
      request = new XMLHttpRequest();
    } else {// code for IE6, IE5
      request = new ActiveXObject("Microsoft.XMLHTTP");
    }
    request.onreadystatechange = base.external(function() {
      if (request.readyState == 4) {
        if (request.status == 200 || request.status === 0) {
          onready(request);
        } else {
          onfail(request);
        }
      }
    });
    request.open("GET", path, true);
    request.send();
  }
  module.ajax = ajax;

  /**
   * uses a resource manifest to load resources
   */
  module.query = function query(manifest) {
    var path = manifest.path;
    base.assertType(path, "string");
    setResourcePath(path);
    
    var resources = manifest.resources;
    base.assertType(resources, Array);
    for (var i = 0; i < resources.length; i++) {
      var resource = resources[i];
      var id = resource.id;
      var type = resource.type;
      var url = resource.url;

      base.assertType(id, "string");
      base.assertType(type, "string");
      base.assertType(url, "string");

      loaders[type](id, url, resource, null);
    }
  };

  // start from https://gist.github.com/creationix/7435851

  // Joins path segments. Preserves initial "/" and resolves ".." and "."
  // Does not support using ".." to go above/outside the root.
  // This means that join("foo", "../../bar") will not resolve to "../bar"
  function join(/* path segments */) {
    // Split the inputs into a list of path commands.
    var parts = [];
    for (var i = 0, l = arguments.length; i < l; i++) {
      parts = parts.concat(arguments[i].split("/"));
    }
    // Interpret the path commands to get the new resolved path.
    var newParts = [];
    for (i = 0, l = parts.length; i < l; i++) {
      var part = parts[i];
      // Remove leading and trailing slashes
      // Also remove "." segments
      if (!part || part === ".")
        continue;
      // Interpret ".." to pop the last segment
      if (part === "..")
        newParts.pop();
      // Push new path segments.
      else
        newParts.push(part);
    }
    // Preserve the initial slash if there was one.
    if (parts[0] === "")
      newParts.unshift("");
    // Turn back into a single string path.
    return newParts.join("/") || (newParts.length ? "/" : ".");
  }

  // A simple function to get the dirname of a path
  // Trailing slashes are ignored. Leading slash is preserved.
  function dirname(path) {
    return join(path, "..");
  }

  // end from
  init();
});