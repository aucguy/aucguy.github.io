base.registerModule('website', function(module) {
	var loading_index = false;
	var indexes_loaded = 0;
	var total_indexes = null;

	module.loadPosts = base.external(function(category, count) {
		if (loading_index
				|| (total_indexes != null && indexes_loaded >= total_indexes)) {
			return;
		}
		loading_index == true;

		var postSpace = document.getElementById("posts");

		resource.ajax(getIndexURL(category, indexes_loaded),
				function(response) {
					var lines = response.responseText.split("\n");
					for (var i = 0; i < lines.length; i++) {
						var line = lines[i];
						if (i == 0 && indexes_loaded == 0) {
							total_indexes = parseInt(line);
						} else if (line.length != 0) {
							(function() {
								var loaded = category + "-" + indexes_loaded
										+ "-" + i;
								postSpace.innerHTML += "<div id=\"$post-"
										+ loaded + "\">post #" + loaded
										+ "</div>";
								resource.ajax(line, function(response) {
									var element = document
											.getElementById('$post-' + loaded);
									element.innerHTML = "<p>"
											+ response.responseText + "</p>";
								});
							})();
						}
					}
					indexes_loaded++;
					loading_index = false;
				});
	});

	function getIndexURL(category, num) {
		return "/categories/" + category + "-" + num + ".index";
	}

	document.addEventListener("DOMContentLoaded", function() {
		module.loadPosts(globalConfig['feedCategory'], 3);
	});
})