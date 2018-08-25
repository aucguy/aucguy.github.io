var base = {};
(function(module, global) {
	var errorThrown = null;
	function onError(error) {
		errorThrown = error;
		console.error(error.stack);
	}
	module.onError = onError;

	function runAndReportErrors(func, self, args) {
		if (typeof self == 'undefined') {
			self = null;
		}
		if (typeof args == 'undefined') {
			args = [];
		}

		try {
			func.apply(self, args);
		} catch (error) {
			onError(error);
		}
	}
	;
	module.runAndReportErrors = runAndReportErrors;

	var modules = [];

	function loadModules() {
		for (var i = 0; i < modules.length; i++) {
			var obj = modules[i];
			if (obj.name == '?global') {
				obj.module(global);
			} else if (obj.name == '?thisIsWindow') {
				obj.module.call(global);
			} else {
				var mod = global[obj.name];
				if (typeof mod == 'undefined') {
					var mod = {};
					global[obj.name] = mod;
				}
				obj.module(mod);
			}
		}
	}

	module.registerModule = function(name, mod) {
		modules.push({
			name : name,
			module : mod
		});
	};

	module.init = function() {
		runAndReportErrors(loadModules);
	};

	module.external = function(func) {
		return function() {
			if(errorThrown === null) {
				runAndReportErrors(func, null, arguments);
			}
		};
	}
})(base, this);