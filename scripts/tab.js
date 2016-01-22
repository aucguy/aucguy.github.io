base.registerModule('tabs', function(module) {
	var tabTemplate = null;
	var tabItemTemplate = null;
	
	/**
	 * whether or not loadTabs needed to be called but couldn't because the tab
	 * template wasn't available
	 */
	var loadTabsNeeded = false;
	
	function getTabList(name) {
		return document.getElementById("tabList-" + name);
	};

	function getTab(name) {
		return document.getElementById("tab-" + name);
	}
	
	module.showTabList = base.external(function(name) {
		getTabList(name).style.display = "block";
	});

	module.hideTabList = base.external(function(name) {
		getTabList(name).style.display = "none";
	});
	
	/**
	 * initialize the tabs using the template
	 */
	module.loadTabs = base.external(function() {
		if (tabTemplate == null || tabItemTemplate == null) {
			loadTabsNeeded = true;
			return;
		}
		if (globalConfig.tabs != null) {
			var tabs = globalConfig.tabs;
			if (tabs.tabs != null) {
				var tabsrow = document.getElementById("tabsrow");
				for (var i = 0; i < tabs.tabs.length; i++) {
					var tab = tabs.tabs[i];
					var name = tab.name || "";
					var link = tab.link || "";
					var tabElement = document.createElement("td");
					tabElement.innerHTML = format(tabTemplate, name, link);
					tabsrow.appendChild(tabElement);
					
					if(tab.items != null) {
						var items = tab.items;
						var listArea = getTabList(name);
						
						for(var k = 0; k < items.length; k++) {
							var item = tab.items[k];
							var itemName = item.name || "";
							var itemLink = item.link || "";
							var itemElement = document.createElement("tr");
							itemElement.innerHTML = format(tabItemTemplate, itemName, itemLink);
							listArea.appendChild(itemElement);
						}
						initTabList(name);
					}
				}
			}
		}
	});

	/**
	 * retrieves the tab template
	 */
	function init() {
		resource.ajax('/assets/tab.html', function(request) {
			tabTemplate = request.responseText;
			if (loadTabsNeeded) {
				loadTabsNeeded = false;
				module.loadTabs();
			}
		});
		resource.ajax('/assets/listitem.html', function(request) {
			tabItemTemplate = request.responseText;
			if (loadTabsNeeded) {
				loadTabsNeeded = false;
				module.loadTabs();
			}
		});
	}
	init();
	
	/**
	 * formats a tab or tab item
	 */
	function format(template, name, link) {
		return template.replace(/@name@/g, name).replace(/@link@/g, link);
	}
	
	function initTabList(name) {
		var content = document.getElementById("tabs");
		var contentRect = content.getBoundingClientRect();
		var tab = getTab(name);
		var list = getTabList(name);
		var rect = tab.getBoundingClientRect();
		list.style.left = rect.left - contentRect.left + "px";
		list.style.top = rect.bottom - contentRect.top - 5 + "px";
	};
});