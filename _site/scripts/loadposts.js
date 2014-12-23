base.registerModule('website', function(module)
{
	var total = 4;
	var loaded = 0;
	
	module.loadPosts = base.external(function(count)
	{
		var limit = Math.min(total, loaded+count);
		var postSpace = document.getElementById("posts");
		for(; loaded<limit; loaded++)
		{
			postSpace.innerHTML += "<div id=\"$post-"+loaded+"\">post #"+loaded+"</div>";
			resource.ajax(getPostURL(loaded), function(i)
			{
				return function(response)
				{
					var element = document.getElementById('$post-'+i);
					element.innerHTML = "<p>"+response.responseText+"</p>";
				}
			}(loaded));
		}
	});
	
	function getPostURL(num)
	{
		return "/posts/"+num+".html";
	}
	
	document.addEventListener("DOMContentLoaded", function()
	{
		module.loadPosts(3);
	});
})