/**
 * bootstrap and simple utilities module
 */
var base = {};
(function(module, global) {
  /**
   * called when an error is thrown. These do not use error handling
   */
  module.errorCallbacks = [];

  /**
   * an array of registered module 'namespaces'
   */
  var modules = [];

  /**
   * whether or not the initial modules (modules embeded in the html document
   * via script tags and aren't dynamically added) have been loaded
   */
  var initialLoadingDone = false;

  /**
   * initializes all the registered modules and reports any errors. Used to
   * start everything
   */
  module.init = function init() {
    runAndReportErrors(start);
  };

  function start() {
    importModule('base'); // just initialize it (already loaded)
    importModule('run'); // just run the code, not refering to anything
  }

  /**
   * called when an error occurs. This reports an error to the user and
   * unregisters anything that is called at an interval (and was registered via
   * base.js).
   * 
   * @param error
   *            exception that occured and is to be reported
   */
  function onError(error) {
    // call error callbacks
    for (var i = 0; i < module.errorCallbacks.length; i++) {
      module.errorCallbacks[i](error);
    }
    // display the error to the console
    console.error(error.name + ": " + error.message);
    console.error(error.stack);

    // display the error on the screen
    var errorDiv = document.getElementById("error div");
    var errorText = document.getElementById("error text");
    var display = document.getElementById("display");

    errorText.innerHTML = error.name + ": " + error.message + "\n" + error.stack;
    // swap displays
    errorDiv.style.display = "block";
    display.style.display = "none";
  }
  module.onError = onError;

  /**
   * calls a function and reports any errors thrown via calling onError()
   * 
   * @param func
   *            the function to call and report errors for
   */
  function runAndReportErrors(func) {
    try {
      func();
    } catch (error) {
      onError(error);
    }
  }
  module.runAndReportErrors = runAndReportErrors;

  /**
   * imports a module and returns the module object
   * 
   * @param name
   *            the name of the module (first argument of registerModule) to
   *            be imported
   */
  function importModule(name) {
    var obj = modules[name]; // get module object
    if (obj.phase !== 0) { // if loaded or loading, return the module
      return obj.scope;
    }
    obj.phase = 1; // set phase to 'loading'

    var mod = null;
    if (obj.name == "?global") {
      mod = global;
      obj.module(mod); // add variables to global scope
    } else if (obj.name == "?thisIsWindow") {
      obj.module.call(global); // 'this' is the global scope in the
      // function
    } else if (obj.name.startsWith("!")) {
      var name = obj.name.substring(1, obj.name.length);
      mod = global[name];
      if (mod === null) {
        mod = {};
        global[name] = mod;
      }
      obj.module(mod);
    } else {
      mod = obj.scope; // register the module in the global
      if (mod === null) {
        mod = {};
        obj.scope = mod;
      }
      obj.module(mod);
    }

    obj.phase = 2; // set phase to 'loaded'
    return mod;
  }
  module.importModule = importModule;

  /**
   * called when a module is registered. Used as a hook (supposed to be
   * overwritten)
   */
  module.onModuleRegistered = function() {
  };

  /**
   * registers a module with base.js
   * 
   * @param name
   *            the name of the module to register. If it is
   * @info '?global' the initialization function will get called with the
   *       argument of the global object (ie the module namespace is the global
   *       namespace.)
   * @info '?thisIsWindow' initialization function will get called with 'this'
   *       as the global object. Useful for modules that were already
   *       written to set variables with 'this'
   * @info other The initialization function will get called with the argument
   *       of the global scope's 'name' attribute (ie global.name)
   * @param mod
   *            The initialization function; a function that initializes a
   *            module object by setting properties on the argument
   */
  module.registerModule = function(name, mod, url) {
    modules[name.startsWith('!') ? name.substring(1, name.length) : name] = {
      name : name,
      module : mod,
      scope : null,
      phase : 0
    // loading stages (0 - unloaded, 1 - loading 2 - loaded)
    };
    module.onModuleRegistered();
  };
  // when everything is loaded, initialize everything
  document.addEventListener("DOMContentLoaded", module.init, false);
})(base, this);

// random utilities section
base.registerModule('!base',
    function(module) {
      /**
       * the ids of the bound intervals returned by base.setInterval
       */
      var intervalHooks = [];

      /**
       * bound event listeners
       */
      var listenerHooks = [];

      /**
       * extends a class from another class. Useful for class hierachy
       * models. To call supermethods to do 'this.method$super()' where
       * 'method' is the method you want to call and 'super' is the name
       * of the superclass passed into base.extend
       * 
       * @param base
       *            the super class to extend (should really be the
       *            initialization function (ie 'initFunc' in 'new
       *            initFunc()'))
       * @param name
       *            the name of the class. Need for calling super methods
       * @param the
       *            overridden attributes of the new class
       * @return the extended class
       */
      module.extend = function extend(bases, name, sub) {
        if(!(bases instanceof Array)) {
          bases = [bases];
        }
        var proto = {}; // the prototype
        var cl = sub;
        if (!cl.hasOwnProperty("constructor")) {
          throw (new Error("Constructor must be defined"));
        }
        
        var attr;
        for (var i = 0; i < bases.length; i++) {
          var base = bases[i];
          for (attr in base.prototype) { // copying old attributes
            if (base.prototype.hasOwnProperty(attr)) {
              var value = base.prototype[attr];
              proto[attr] = value;
              if (typeof base.prototype.__name__ !== undefined && attr.indexOf("$") == -1) {
                proto[attr + "$" + base.prototype.__name__] = value; // setting
                // "super methods"
              }
            }
          }
        }

        proto.__name__ = name; // needed for child classes

        for (attr in cl) { // copying new attributes
          if (cl.hasOwnProperty(attr)) {
            proto[attr] = cl[attr];
          }
        }

        proto.constructor.prototype = proto; // setting constructor prototype
        Object.setPrototypeOf(proto.constructor.prototype, bases[0].prototype);
        return proto.constructor;
      };

      /**
       * Has the same behavior as javascript's normal setInterval but it
       * reports any errors that happen during the function to the user
       * and if any errors occur anywhere, it clears the interval. Useful
       * if you don't want a function to execute after an error. Note if
       * you use this use base.js's clearInterval, not the regular one.
       * 
       * @param func
       *         the function to call at a certaint interval
       * @param inter
       *         the interval to call 'func'
       * @return the id associated with the interval. Pass this to clear
       *         interval to stop calling the function
       */
      module.setInterval = function setInterval_(func, inter) {
        var r = setInterval(function() {
          module.runAndReportErrors(func);
        }, inter);
        intervalHooks.push(r);
        return r;
      };

      /**
       * Has the same behavior as javascripts' normal clearInterval but it
       * undoes the hooking with base.js If you used base.setInterval then
       * use this too, if not don't use this
       * 
       * @param int
       *         the id returned from setInterval
       */
      module.clearInterval = function clearInterval_(int) {
        clearInterval(int);
        intervalHooks.splice(intervalHooks.indexOf(int), 1);
      };
      
      /**
       * adds a listener to an element, but if an error occurs during the 
       * callback, it is reported. If you use base's addListener, use
       * base's removeListener
       * @param element 
       *        the element to add a listener to
       * @param event
       *        the event to listen for
       * @param callback
       *        the function to call when the event occurs
       **/
      module.addListener = function addListener(element, event, callback) {
        var ext = base.external(callback);
        element.addEventListener(event, ext);
        listenerHooks.push({
          element : element,
          event : event,
          ext : ext,
          callback : callback
        });
      };

      module.removeListener = function removeListener(element, event, callback) {
        for (var i = 0; i < listenerHooks.length; i++) {
          var obj = listenerHooks[i];
          if (obj.element == element && obj.event == event && obj.callback == callback) {
            obj.element.removeEventListener(event, obj.ext);
            listenerHooks.splice(i, 1);
            break;
          }
        }
      };
      
      /**
       * unhooks stuff
       **/
      module.errorCallbacks.push(function(error) {
        var i;
        for (i = 0; i < intervalHooks.length; i++) {
          module.clearInterval(intervalHooks[i]);
        }
        for (i = 0; i < listenerHooks.length; i++) {
          var obj = listenerHooks[i];
          module.removeListener(obj.element, obj.event, obj.callback);
        }
      });

      /**
       * returns a function that runs another function. If an error is
       * thrown run another
       * 
       * @param self
       *            the 'this' in the function 'func'
       * @param func
       *            the function that will be called when the returned
       *            function is called
       * @param onfail
       *            called if the function 'func' throws an error
       * @return a function that calls 'func' and if 'func' throws an
       *         error, calls onfail
       */
      module.runAndOnFail = function runAndOnFail(self, func, onfail) {
        return function(/* args */) {
          try {
            func.apply(self, arguments);
          } catch (error) {
            var args = [ error ];
            for (var i = 0; i < arguments.length; i++) {
              args.push(arguments[i]);
            }
            onfail.apply(null, args);
          }
        };
      };

      /**
       * returns a function does exactly what the argument function would
       * do, but reports errors. Useful for having callbacks on html elements
       * 
       * @param func
       *            the function to call / behavior is emulated
       * @return a function that handles errors
       */
      module.external = function external(func) {
        var ret = module.runAndOnFail(null, func, base.onError);
        ret.func = func;
        return ret;
      };

      /**
       * throws an error if the value is not of the specified type
       * 
       * @param value
       *            the value to check its type
       * @param type
       *            the type expected of the value
       */
      module.assertType = function assertType(value, type) {
        if (!isOfType(value, type)) {
          throw (new Error("value is not correct type"));
        }
      };
      
      function isOfType(value, type) {
        if(value === null) { //null
          return type === null;
        } else if(typeof type == "string") { //primitives
          return typeof value == type;
        } else {
          return value instanceof type;
        }
      }

      /**
       * parses an int while handling exponents
       * 
       * @param str
       *            the string to parse
       */
      module.safeParseInt = function safeParseInt(str) {
        return Math.round(parseFloat(str));
      };

      module.abstractMethod = function abstractMethod() {
        throw(new Error("Abstract Method called"));
      };

      // TODO: implemenent Element.setAttribute for IE
    });