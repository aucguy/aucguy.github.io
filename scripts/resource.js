base.registerModule('resource',
		function(module) {
			module.ajax = function(path, onready, onfail) {
				if (typeof onfail == 'undefined') {
					onfail = function(request) {
						console.warn("resource " + path
								+ " failed to load with a status of "
								+ request.status);
					};
				}

				onready = base.external(onready);
				onfail = base.external(onfail);

				// taken from
				// http://www.w3schools.com/ajax/tryit.asp?filename=tryajax_first
				// and modified
				var request;
				if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome,
											// Opera, Safari
					request = new XMLHttpRequest();
				} else {// code for IE6, IE5
					request = new ActiveXObject("Microsoft.XMLHTTP");
				}
				request.onreadystatechange = function() {
					if (request.readyState == 4) {
						if (request.status == 200 || request.status == 0) {
							try {
								onready(request);
							} catch (error) {
								console
										.error(error.name + ": "
												+ error.message);
								console.error(error.stack);
							}
						} else {
							onfail(request);
						}
					}
				};
				request.open("GET", path, true);
				request.send();
			};
		});