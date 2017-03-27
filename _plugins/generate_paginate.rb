#from https://divshot.com/blog/web-development/advanced-jekyll-features/#custom-post-types
#and modified

module Jekyll
  #help from http://brizzled.clapper.org/blog/2010/12/20/some-jekyll-hacks/
  class IndexPage < Page
    attr_accessor :dir, :custom_data
    
    def initialize(site, path, num_page, pager)
      @site = site
      @base = site.source
      @dir = File.dirname(path)
      @name = File.basename(path)
      @custom_data = {}
      
      self.process(@name)

      layout = File.join(@base, '_layouts', 'paginate.html')
      header_mark = /^---/
      header_length = 4

      if File.file?(layout)
        content = File.read(layout)
        index = content.index(header_mark)
        if not index.nil?
          index = content.index(header_mark, index + header_length)
          if not index.nil?
            content = content[index + header_length..content.length]
          end
        end
      else
        content = ""
      end
      self.content = content
      self.data ||= {}
      
      @custom_data['paginator'] = pager.to_liquid
      @custom_data.each do |key, value|
        self.data[key] = value
      end
      
      self.render(site.layouts, site.site_payload)
    end
  end
  
  class HtmlPage < Page
    def initialize(site, path, body_page)
      @site = site
      @base = site.source
      @dir = File.dirname(path)
      @name = File.basename(path)
      
      self.process(@name)
      self.read_yaml(File.join(@base, '_layouts'), 'paginateHtml.html')
      self.data['index_page'] = body_page.content
      body_page.custom_data.each do |key, value|
        if not self.data.has_key?(key)
          self.data[key] = value
        end
      end
      self.data['paginator']
      self.render(site.layouts, site.site_payload)
    end
  end

  module Generators
    class Pagination < Generator
      def generate(site)
        begin
          doGen(site)
        rescue Exception => e
          puts(e.message)
          puts(e.backtrace)
          raise e
        end
      end
      
      # Generate paginated pages if necessary.
      #
      # site - The Site.
      #
      # Returns nothing.
      def doGen(site)
        if site.config.has_key?('custom_paginate') and site.config['custom_paginate'].respond_to?('each')
          site.config['custom_paginate'].each do |category, data|
            if data.respond_to?('has_key?') and data.has_key?('posts_per_page') and data.has_key?('path') and data.has_key?('html_path')
              paginate(site, data['path'], data['html_path'], category, data['posts_per_page'].to_i)
            else
              puts("warning: invalid paginate data for category #{category}")
            end
          end
        end
      end

      # Paginates the blog's posts. Renders the index.html file into paginated
      # directories, e.g.: page2/index.html, page3/index.html, etc and adds more
      # site-wide data.
      #
      # site - The Site.
      # page - The index.html Page that requires pagination.
      #
      # {"paginator" => { "page" => <Number>,
      #                   "per_page" => <Number>,
      #                   "posts" => [<Post>],
      #                   "total_posts" => <Number>,
      #                   "total_pages" => <Number>,
      #                   "previous_page" => <Number>,
      #                   "next_page" => <Number> }}
      def paginate(site, page_path, html_path, category, posts_per_page)
        all_posts = site.site_payload['site']['categories'][category]

        pages = Pager.calculate_pages(all_posts, posts_per_page)
        (1..pages).each do |num_page|
          pager = Pager.new(category, num_page, all_posts, pages, page_path, html_path, posts_per_page)
          newpage = IndexPage.new(site, page_path.sub(":num", num_page.to_s), num_page, pager)
          site.pages << newpage
          htmlpage = HtmlPage.new(site, html_path.sub(":num", num_page.to_s), newpage)
          site.pages << htmlpage
        end
      end
    end
  end

  class Pager
    attr_reader :page, :per_page, :posts, :total_posts, :total_pages,
      :previous_page, :previous_page_path, :next_page, :next_page_path

    # Calculate the number of pages.
    #
    # all_posts - The Array of all Posts.
    # per_page  - The Integer of entries per page.
    #
    # Returns the Integer number of pages.
    def self.calculate_pages(all_posts, per_page)
      (all_posts.size.to_f / per_page.to_i).ceil
    end

    # Determine if the subdirectories of the two paths are the same relative to source
    #
    # source        - the site source
    # page_dir      - the directory of the Jekyll::Page
    # paginate_path - the absolute paginate path (from root of FS)
    #
    # Returns whether the subdirectories are the same relative to source
    def self.in_hierarchy(source, page_dir, paginate_path)
      return false if paginate_path == File.dirname(paginate_path)
      return false if paginate_path == Pathname.new(source).parent
      page_dir == paginate_path ||
        in_hierarchy(source, page_dir, File.dirname(paginate_path))
    end

    # Static: Return the pagination path of the page
    #
    # site     - the Jekyll::Site object
    # num_page - the pagination page number
    # target_page - the page where pagination is occurring
    #
    # Returns the pagination path as a string
    def self.paginate_path(num_page, format)
      return nil if num_page.nil?
      format = format.sub(':num', num_page.to_s)
      ensure_leading_slash(format)
    end

    # Static: Return a String version of the input which has a leading slash.
    #         If the input already has a forward slash in position zero, it will be
    #         returned unchanged.
    #
    # path - a String path
    #
    # Returns the path with a leading slash
    def self.ensure_leading_slash(path)
      path[0..0] == "/" ? path : "/#{path}"
    end

    # Static: Return a String version of the input without a leading slash.
    #
    # path - a String path
    #
    # Returns the input without the leading slash
    def self.remove_leading_slash(path)
      ensure_leading_slash(path)[1..-1]
    end

    # Initialize a new Pager.
    #
    # config    - The Hash configuration of the site.
    # page      - The Integer page number.
    # all_posts - The Array of all the site's Posts.
    # num_pages - The Integer number of pages or nil if you'd like the number
    #             of pages calculated.
    def initialize(category, page, all_posts, num_pages, format, htmlformat, posts_per_page)
      @page = page
      @category = category
      @per_page = posts_per_page
      @total_pages = num_pages || Pager.calculate_pages(all_posts, @per_page)

      if @page > @total_pages
        raise RuntimeError, "page number can't be greater than total pages: #{@page} > #{@total_pages}"
      end

      init = (@page - 1) * @per_page
      offset = (init + @per_page - 1) >= all_posts.size ? all_posts.size : (init + @per_page - 1)
	
      @total_posts = all_posts.size
      @posts = all_posts[init..offset]
      @previous_page = @page != 1 ? @page - 1 : nil
      @previous_page_path = Pager.paginate_path(@previous_page, format)
      @next_page = @page != @total_pages ? @page + 1 : nil
      @next_page_path = Pager.paginate_path(@next_page, format)
      @next_htmlpage_path = Pager.paginate_path(@next_page, htmlformat)
    end

    # Convert this Pager's data to a Hash suitable for use by Liquid.
    #
    # Returns the Hash representation of this Pager.
    def to_liquid
      {
        'page' => page,
        'per_page' => per_page,
        'posts' => posts,
        'total_posts' => total_posts,
        'total_pages' => total_pages,
        'previous_page' => previous_page,
        'previous_page_path' => previous_page_path,
        'next_page' => next_page,
        'next_page_path' => next_page_path,
        'next_htmlpage_path' => @next_htmlpage_path,
        'category' => @category
      }
    end
  end
  
  class PaginateTag < Liquid::Tag
    def initialize(tag_name, text, tokens)
      super
      @text = text
    end
    
    #TODO check argument correctness
    def render(context)
      parts = @text.split(' ').reject { |c| c.empty? }
      if parts.size < 3
        puts('not enough arguments for {% get_paginate %}')
        return ''
      end
            
      category = parts[0]
      posts_per_page = parts[1].to_i
      num_page = parts[2].to_i
      all_posts = context.registers[:site].site_payload['site']['categories'][category]
      num_pages = Pager.calculate_pages(all_posts, posts_per_page)
      format = context.registers[:site].config['custom_paginate'][category]['path']
      html_format = context.registers[:site].config['custom_paginate'][category]['html_path']
      context.registers[:page]['paginator'] = Pager.new(category, num_page, all_posts, num_pages, format, html_format, posts_per_page).to_liquid
      ''
    end
  end
end

Liquid::Template.register_tag('get_paginate', Jekyll::PaginateTag)