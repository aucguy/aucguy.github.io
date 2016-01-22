module Jekyll
  class Organizer < Generator
    safe true
    def generate(site)
      for post in site.posts
        post.instance_variable_set("@url", File.join("posts", post.url))
      end
    end
  end
end