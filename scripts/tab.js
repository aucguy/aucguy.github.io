base.registerModule('tabs', function(module) {
	function getTabList(name) {
		return document.getElementById("tabList-" + name);
	};
	
	module.showTabList = base.external(function(name) {
		getTabList(name).style.display = "block";
	});

	module.hideTabList = base.external(function(name) {
		getTabList(name).style.display = "none";
	});
});