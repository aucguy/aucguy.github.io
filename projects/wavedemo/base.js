/**
 * this is a bootstrap and simple utilities module
 */

var base = new Object();
(function(module, global) {
	/**
	 * the functions that were set to be called at an interval (ie returned by
	 * setInterval)
	 */
	var hooked = [];
	/**
	 * called when an error occurs
	 */
	function onError(error) {
		// clear intervals (stops everything)
		for (var i = 0; i < hooked.length; i++) {
			clearInterval(hooked[i]);
		}
		// display the error int the console
		console.error(error.name + ": " + error.message);
		console.error(error.stack);

		// display the error on the screen
		var errorDiv = document.getElementById("error div");
		var errorText = document.getElementById("error text");
		var display = document.getElementById("display");

		errorText.innerHTML = error.name + ": " + error.message + "\n"
				+ error.stack;
		// swap displays
		errorDiv.style.display = "block";
		display.style.display = "none";
	}
	module.onError = onError;

	/**
	 * calls a function. If an error occurs then clear all the intervals, and
	 * display the error in the console and the screen
	 */
	function runAndReportErrors(func) {
		try {
			func();
		} catch (error) {
			onError(error);
		}
	}
	;
	module.runAndReportErrors = runAndReportErrors;

	/**
	 * an array of registered modules (functions initialize these)
	 */
	var modules = [];

	/**
	 * loads any registered modules
	 */
	function loadModules() {
		for (var i = 0; i < modules.length; i++) {
			var obj = modules[i];
			if (obj.name == "?global") {
				var mod = global;
				obj.module(mod); // add variables to global scope
			} else if (obj.name == "?thisIsWindow") {
				obj.module.call(global); // this is the global scope in the
				// function
			} else {
				var mod = new Object();
				global[obj.name] = mod; // register the module in the global
				// scope
				obj.module(mod);
			}
		}
		;
	}
	;

	/**
	 * registers a module with base.js name - the name of the module. If it is
	 * ... '?global' - mod will get called with the argument of the global
	 * object '?thisIsWindow' - mod will get called with 'this' being the global
	 * object other - mod will get called with the argument of the global
	 * scope's 'name' attribute (global.name) mod - a function that initializes
	 * a module
	 */
	module.registerModule = function(name, mod) {
		modules.push({
			name : name,
			module : mod
		});
	};

	/**
	 * initializes all the registered modules and reports any errors Call this
	 * not loadModules!
	 */
	module.init = function() {
		runAndReportErrors(loadModules);
	};

	/**
	 * calls javascript's normal setInterval, reports any errors that happen
	 * during func and if any errors occur anywhere, stops javascript from
	 * calling func
	 */
	module.setInterval = function(func, inter) {
		var r = setInterval(function() {
			runAndReportErrors(func);
		}, inter);
		hooked.push(r);
		return r;
	};

	/**
	 * calls javascripts normal clearInterval and undoes the hooking with
	 * base.js If you used base.setInterval then use this too, if not don't use
	 * this
	 */
	module.clearInterval = function(int) {
		clearInterval(int);
		hooked.splice(hooked.indexOf(int), 1);
	};
	// when everything is loaded, initialize everything
	document.addEventListener("DOMContentLoaded", module.init, false);
})(base, this);

// random utilities section
base.registerModule('?global', function(module) {
	/***************************************************************************
	 * extends an class parent - the constructor of the class to extend sub -
	 * the constructor of the class that is extended this also creates sets
	 * 'sub.super' to 'parent' to add methods or fields just do 'sub.prototype =
	 * whateverYouWant'
	 */
	module.oldextend = function(base, sub) {
		sub.prototype = Object.create(base.prototype);
		sub.prototype.constructor = sub;
		sub.super = base.prototype;
		return sub;
	};

	module.extend = function extend(base, name, sub) {
		var proto = new Object();
		var cl = sub;

		for ( var attr in base.prototype) {
			if (base.prototype.hasOwnProperty(attr)) {
				var value = base.prototype[attr];
				proto[attr] = value;
				if (typeof base.prototype.__name__ != undefined
						&& attr.indexOf("$") == -1) {
					proto[attr + "$" + base.prototype.__name__] = value;
				}
			}
		}

		proto.__name__ = name;

		for ( var attr in cl) {
			if (cl.hasOwnProperty(attr)) {
				proto[attr] = cl[attr];
			}
		}
		
		proto.constructor.prototype = proto;
		return proto.constructor;
	}

	/**
	 * parses an int while handling exponents
	 */
	module.safeParseInt = function(str) {
		return Math.round(parseFloat(str));
	};

	/**
	 * returns a function that runs another function. If an error is thrown run
	 * another
	 */
	module.runAndOnFail = function(self, func, onfail) {
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
	
	module.external = function(func) {
		return module.runAndOnFail(null, func, base.onError);
	}

	// TODO: implemenent Element.setAttribute for IE
});