require 'Nokogiri'
require 'multi_js'
require 'multi_css'

#compresses html
module Jekyll
  class FilterSax < Nokogiri::XML::SAX::Document
    #the compressed content so far
    attr_accessor :content
    
    def initialize(site)
      @content = ''
      @stack = [] #the current nesting of tags
      @site = site
    end
    
    def start_element(name, attrs=[])
      #text for start tag
      tag = "<#{name}"
      attrs.each do |item|
        tag += " #{item[0]}=\"#{item[1]}\""
      end
      tag += ">"

      #simply output the text
      @content += tag
      @stack.push(name)
    end
    
    def characters(text)
      #don't remove whitespace if the text is in a pre or textarea tag
      #remove excess whitespace otherwise
      if @stack.include?('pre') or @stack.include?('textarea')
        @content += text.encode(:xml => :text)
      else
        @content += text.gsub(/[ \t\n\r]+/, ' ').encode(:xml => :text)
      end
    end
    
    def cdata_block(text)
      #compress the text using by appropriate means based on the tag or lack of.
      if @stack.last == 'script'
        @content += MultiJs.compile(text, @site.config['jekyll-press'] && @site.config['jekyll-press']['js_options'] || {})
      elsif @stack.last == 'style'
        @content += MultiCss.min(text, @site.config['jekyll-press'] && @site.config['jekyll-press']['css_options'] || {})
      else
        @content += "<![CDATA[#{text}]]>"
      end
    end
    
    def end_element(name)
      #simply output the end tag
      tag = "</#{name}>"
      
      if @stack.last == name
        @stack.pop()
      else
        #misnested tags may mess up this program
        puts('warning: open tag')
      end
      @content += tag
    end
  end
  
  def self.compress_html(site, html)
    filter = FilterSax.new(site)
    #the HTML parser will output cdata for the contents of script and style tags
    Nokogiri::HTML::SAX::Parser.new(filter).parse(html)
    return filter.content
  end
end