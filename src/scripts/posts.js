base.registerModule('posts', function(module) {
	var nextPage = null;
	var parser = new DOMParser();

	module.loadPosts = base.external(function() {
		if(nextPage === null) {
			return;
		}
		
		var div = document.createElement('div');
		document.getElementById('posts').appendChild(div);
		
		resource.ajax(nextPage, function(response) {
			var dom = parser.parseFromString(response.responseText, 'text/html');
			setNextPage(dom);
			while(dom.body.childNodes.length !== 0) {
				var child = dom.body.childNodes[0];
				dom.body.removeChild(child);
				div.appendChild(child);
			}
		});
	});
	
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
	
	document.addEventListener("DOMContentLoaded", base.external(function() {
		setNextPage(document);
		document.getElementById('loadButton').style.display = 'inline';
	}));
});