(function() {
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
	
	var nextPage = null;
	var parser = new DOMParser();

	window.posts = {
		loadPosts: function() {
			if(nextPage === null) {
				return;
			}
			
			var div = document.createElement('div');
			document.getElementById('posts').appendChild(div);
			
			ajax(nextPage, function(response) {
				var dom = parser.parseFromString(response.responseText, 'text/html');
				setNextPage(dom);
				while(dom.body.childNodes.length !== 0) {
					var child = dom.body.childNodes[0];
					dom.body.removeChild(child);
					div.appendChild(child);
				}
			});
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
	
	document.addEventListener("DOMContentLoaded", function() {
		setNextPage(document);
		document.getElementById('loadButton').style.display = 'inline';
	});
	
	function getTabList(name) {
		return document.getElementById("tabList-" + name);
	};
	
	window.tabs = {
		showTabList: function(name) {
			getTabList(name).style.display = "block";
		},
		hideTabList: function(name) {
			getTabList(name).style.display = "none";
		}
	}
})();