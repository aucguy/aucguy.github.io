base.registerModule('website', function(module) {
	var getTabList = function(name) {
		return document.getElementById("tabList-" + name);
	};

	var getTab = function(name) {
		return document.getElementById("tab-" + name);
	}

	module.showTabList = base.external(function(name) {
		getTabList(name).style.display = "block";
	});

	module.hideTabList = base.external(function(name) {
		getTabList(name).style.display = "none";
	});

	module.initTabList = base.external(function(name) {
		var content = document.getElementById("tabs");
		var contentRect = content.getBoundingClientRect();
		var tab = getTab(name);
		var list = getTabList(name);
		if (tab != null && list != null || true) {
			var rect = tab.getBoundingClientRect();
			list.style.left = rect.left - contentRect.left + "px";
			list.style.top = rect.bottom - contentRect.top - 5 + "px";
		}
	});
});