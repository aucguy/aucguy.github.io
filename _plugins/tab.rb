#generate the tabs at the top of the screen
module Jekyll
  #an asset that contains a tab or tabitem
  class TabPage < Page
    def initialize(site, path, template, data)
      @site = site
      @base = site.source
      @dir = File.dirname(path)
      @name = File.basename(path)
      
      #get the content, register the data and render
      self.process(@name)
      content_path = File.join(@base, '_includes', File.dirname(template), File.basename(template))
      self.content = File.read(content_path)
      self.data = {
        'tab' => data
      }
      self.render(site.layouts, site.site_payload)
    end
  end

  #generates the tabs
  class TabGenerator < Generator
    def generate(site)
      if site.config.has_key?('tabs')
        #get the global config
        tab_config = site.config['tabs']
        tab_path = tab_config['tab_path']
        item_path = tab_config['item_path']
        tab_template = tab_config['tab_template']
        item_template = tab_config['item_template']
        
        #generate each tab
        tab_config['items'].each do |name, data|
          info = make_info(name, data)
          site.pages << TabPage.new(site, format_path(tab_path, info), 
            format_path(tab_template, info), info)
          
          if data.has_key?('items')
            #generate the tabitem
            data['items'].each do |name, data|
              item_info = make_info(name, data)
              item_info['tab'] = info['name']
              site.pages << TabPage.new(site, format_path(item_path, item_info),
                format_path(item_template, item_info), item_info)
            end
          end
        end
      end
    end

    #format the path based on the config
    def format_path(path, info)
      if info.has_key?('name')
        path = path.sub(':name', info['name'])
      end
      if info.has_key?('tab')
        path = path.sub(':tab', info['tab'])
      end
      path
    end

    #make the data available to the tab's liquid
    def make_info(name, data)
      info = data.clone
      info['name'] = name
      info
    end
  end
end