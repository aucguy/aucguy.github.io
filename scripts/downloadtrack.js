base.registerModule('downloadtrack', function(module) {
	function main() {
		var links = document.getElementsByTagName('a');
		for(var i=0; i<links.length; i++) {
			var link = links[i];
			var url = link.getAttribute('href');
			if(url != null && url.indexOf('downloads/') != -1) {
				link.onclick = base.external(function() {
					ga('event', 'send', 'download:'+url, 'click');
				});
			}
		}
	}
	document.addEventListener('DOMContentLoaded', base.external(main));
});