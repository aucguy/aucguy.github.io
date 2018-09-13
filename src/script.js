(function() {
	function safeParseInt(x) {
		try {
			return parseInt(x);
		} catch(e) {
			return null;
		}
	}
	
	function ajax(path, onready, onfail) {
		onready = onready || function() {};
		onfail = onfail || function(request) {
			console.warn("resource " + path
				+ " failed to load with a status of "
				+ request.status);
		}

		// taken from
		// http://www.w3schools.com/ajax/tryit.asp?filename=tryajax_first
		// and modified
		var request = XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
		request.onreadystatechange = function() {
			if (request.readyState == 4) {
				if (request.status == 200 || request.status == 0) {
					onready(request);
				} else {
					onfail(request);
				}
			}
		};
		request.open("GET", path, true);
		request.send();
	}
	
	var pathTemplate = "<%- lib.readConfig('config.json').paginate.embedded.output %>";
	var parser = new DOMParser();
	var totalPages = null;
	var nextPage = 1;
	
	function setLoadButtonStyle(style) {
		document.getElementById('loadButtonDiv').style.display = style;
	}
	
	function loadPosts() {
		if(totalPages === null || nextPage >= totalPages) {
			setLoadButtonStyle('none');
			return;
		}
		
		var div = document.createElement('div');
		document.getElementById('posts').appendChild(div);
		
		var path = pathTemplate.replace('${i}', nextPage++);
		ajax(path, function(response) {
			var dom = parser.parseFromString(response.responseText, 'text/html');
			while(dom.body.childNodes.length !== 0) {
				var child = dom.body.childNodes[0];
				dom.body.removeChild(child);
				div.appendChild(child);
			}
		});
		
		if(nextPage >= totalPages) {
			setLoadButtonStyle('none');
		}
	};
	
	function setNextPage(dom) {
		nextPage = null;
		var elem = dom.getElementById('indexData');
		if(elem !== null) {
			var data;
			try {
				data = JSON.parse(elem.textContent);
			} catch(error) {
				return;
			}
			if(typeof data.nextPage === 'string' && data.nextPage !== 'null') {
				nextPage = data.nextPage;
			}
		}
	}
	
	
	function showTabList(tablist) {
		tablist.style.display = "block";
	}
	
	function hideTabList(tablist) {
		tablist.style.display = "none";
	}
	
	document.addEventListener("DOMContentLoaded", function() {
		var loadButton = document.getElementById('loadButton');
		if(loadButton !== null) {
			loadButton.addEventListener('click', loadPosts);
		}
		var tabsrow = document.getElementById('tabsrow');
		if(tabsrow !== null) {
			for(var i=0; i<tabsrow.children.length; i++) {
				var tab = tabsrow.children[i];
				var tablist = document.getElementById('tabList-' + tab.id.replace('tab-', ''));
				tab.addEventListener('mouseover', showTabList.bind(null, tablist));
				tab.addEventListener('mouseout', hideTabList.bind(null, tablist));
			}
		}
		
		var elems = document.getElementsByTagName('meta');
		for(var i=0; i<elems.length; i++) {
			var elem = elems[i];
			if(elem.getAttribute('property') === 'self:totalPages') {
				totalPages = safeParseInt(elem.getAttribute('content'));
				break;
			}
		}
		if(totalPages !== null) {
			setLoadButtonStyle('inline');
		}
	});
})();