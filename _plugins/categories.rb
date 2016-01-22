#from http://jekyllrb.com/docs/plugins/
POSTS_PER_INDEX = 3

module Jekyll
  class CategoryPage < Page
    def initialize(site, name, posts)
      @site = site
      @base = site.source
      @dir = "categories"
      @name = name + ".index"
      @posts = posts
      self.process(@name)
      self.read_yaml(File.join(@base, '_layouts'), 'indexes.html')
      self.data['posts'] = posts
    end
  end
  
  
  class CategoryPageGenerator < Generator
    safe true
		
    def generate(site)
      posts = self.sortPosts(site.posts)
      indexes = self.genIndexes(site, posts)
      for page in self.createPages(site, indexes)
        self.addPage(site, page)
      end
    end
    
    #sorts posts - newest to oldest
    def sortPosts(posts)
      sorted = []
      for placing in posts
        oldest = true
        for i in 0..sorted.length-1
          checking = sorted[i]
          if self.isYounger(placing, checking)
            oldest = false
            sorted.insert(i, placing)
            break
          end
        end
        if oldest
          sorted.push(placing)
        end
      end
      return sorted
    end
    
    #tells whether a is older then b
    def isYounger(a, b)
      if a.date.year != b.date.year
        return a.date.year > b.date.year
      end
      if a.date.month != b.date.month
        return a.date.month > b.date.month
      end
      if a.date.day != b.date.day
        return a.date.day > b.date.day
      end
      return false
    end
      
    #indexes posts for dynamic client post loading
    def genIndexes(site, posts)
      indexes = {}
      for post in posts
    		if post.data.has_key?('category')
    			category = post.data['category']
    			if indexes.has_key?(category)
            indexes[category].push(post.url)
    			else
    			  indexes[category] = [post.url]
    			end
    		end
    	end
    	return indexes
    end
   
    # adds a page to the site
    def addPage(site, page)
      page.render(site.layouts, site.site_payload)
      page.write(site.dest)
      site.pages << page
    end
    
    #creates the index files from the indexes provided from genIndexes()
    def createPages(site, indexes)
      pages = []
      indexes.each do |category, posts|
        total_indexes = (posts.length/(POSTS_PER_INDEX*1.0)).ceil
        post_index = 0
        for index_count in 0..total_indexes-1
          content = index_count == 0 ? total_indexes.to_s + "\n" : ""
          for i in 0..POSTS_PER_INDEX-1
            if post_index >= posts.length
              break
            end
            content += posts[post_index] + "\n"
            post_index += 1
          end
          pages.push(CategoryPage.new(site, category+"-"+index_count.to_s, content))
        end
      end
      return pages
    end
 	end
end