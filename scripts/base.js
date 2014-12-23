var base = new Object();
(function(module, global)
{
	var hooked = [];
	function onError(error)
	{
		for(var i=0; i<hooked.length; i++)
		{
			clearInterval(hooked[i]);
		}
		console.error(error.name + ": " + error.message);
		console.error(error.stack);

		alert(error.name+": "+error.message+"\n"+error.stack);
	}
	module.onError = onError;

	function runAndReportErrors(func, self, args)
	{
		if(typeof self == 'undefined')
		{
			self = null;
		}
		if(typeof args == 'undefined')
		{
			args = [];
		}
		
		try
		{
			func.apply(self, args);
		}
		catch(error)
		{
			onError(error);
		}
	};
	module.runAndReportErrors = runAndReportErrors;
	
	var modules = [];
	
	function loadModules()
	{
		for(var i=0; i<modules.length; i++)
		{
			var obj = modules[i];
			if(obj.name == "?global")
			{
				var mod = global;
				obj.module(mod);
			}
			else if(obj.name == "?thisIsWindow")
			{
				obj.module.call(global);
			}
			else
			{
				var mod = new Object();
				global[obj.name] = mod;
				obj.module(mod);
			}
		};
	};
	
	module.registerModule = function(name, mod)
	{
		modules.push({name:name, module:mod});
	};
	
	module.init = function()
	{
		runAndReportErrors(loadModules);
	};

	module.setInterval = function(func, inter)
	{
		var r = setInterval(function(){runAndReportErrors(func);}, inter);
		hooked.push(r);
		return r;
	};
	
	module.clearInterval = function(int)
	{
		clearInterval(int);
		hooked.splice(hooked.indexOf(int), 1);
	};
	
	module.external = function(func)
	{
		return function()
		{
			runAndReportErrors(func, null, arguments);
		};
	}
})(base, this);

base.registerModule('?global', function(module)
{
	module.extend = function(base, sub)
	{
		sub.prototype = Object.create(base.prototype);
		sub.prototype.constructor = sub;
		sub.super = base.prototype;
		return sub;
	};
	
	/*parseInt doesn't handle exponents*/
	module.safeParseInt = function(str)
	{
		return Math.round(parseFloat(str));
	}
	//TODO: implemenent Element.setAttribute for IE
});