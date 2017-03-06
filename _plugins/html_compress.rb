require 'Nokogiri'
require 'multi_js'
require 'multi_css'

module Jekyll
  CDATA_NAMES = ['script', 'style', 'pre', 'textarea']
  
  class FilterSax < Nokogiri::XML::SAX::Document
    attr_accessor :content
    
    def initialize(site)
      @content = ''
      @stack = []
      @site = site
    end
    
    def start_element(name, attrs=[])
      #text for start tag
      tag = "<#{name}"
      attrs.each do |item|
        tag += " #{item[0]}=\"#{item[1]}\""
      end
      tag += ">"
      
      @content += tag
      @stack.push(name)
    end
    
    def characters(text)
      @content += text.gsub(/[ \t\n\r]+/, ' ').encode(:xml => :text)
    end
    
    def cdata_block(text)
      if @stack.last == 'script'
        @content += MultiJs.compile(text, @site.config['jekyll-press'] && @site.config['jekyll-press']['js_options'] || {})
      elsif @stack.last == 'style'
        @content += MultiCss.min(text, @site.config['jekyll-press'] && @site.config['jekyll-press']['css_options'] || {})
      else
        @content += "<![CDATA[#{text}]]>"
      end
    end
    
    def end_element(name)
      tag = "</#{name}>"
      
      if @stack.last == name
        @stack.pop()
      else
        puts('warning: open tag')
      end
      @content += tag
    end
  end
  
  def self.compress_html(site, html)
    filter = FilterSax.new(site)
    Nokogiri::HTML::SAX::Parser.new(filter).parse(html)
    return filter.content
  end
end