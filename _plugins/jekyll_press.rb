#from https://github.com/stereobooster/jekyll-press/blob/master/lib/jekyll-press.rb

require 'Open3'
require 'digest/sha2'
require 'yaml'
require 'multi_css'
require 'multi_js'

module Jekyll
  $min_checksum = {}
  $static_output = {}

  module StaticFileExt
    def write(dest)
      if path.nil? or $static_output[path].nil?
        super
      else
        dest_path = destination(dest)
        Jekyll::write_file(dest_path, $static_output[path])
      end
    end
  end
  
  class StaticFile
    attr_reader :dir, :site
    prepend StaticFileExt
  end

  def self.output_js(path, page, content)
    return content if path =~ /.min.js$/
    begin
      return MultiJs.compile(content, page.site.config['jekyll-press'] && page.site.config['jekyll-press']['js_options'] || {})
    rescue MultiJs::ParseError => e
      return parse_error(path, content, e)
    end
  end

  def self.output_css(path, page, content)
    return content if path =~ /.min.css$/
    begin
     return MultiCss.min(content, page.site.config['jekyll-press'] && page.site.config['jekyll-press']['css_options'] || {})
    rescue MultiCss::ParseError => e
      return parse_error(path, content, e)
    end
  end
  
  def self.output_html(path, page, content)
    return content if page =~ /.min.html$/
    return compress_html(page.site, content)
  end

  def self.output_svg(path, page, content)
    return content if page =~ /.min.svg$/
    options = page.dir
    while not File.file?(File.join(page.site.source, options, 'svgo.yml')) and not ['.', '/'].include?(options)
      options = File.dirname(options)
    end
    
    if not ['.', '/'].include?(options)
      path = File.join(page.site.source, options, 'svgo.yml')
      config = "--config=#{path}"
      yaml = YAML.load(File.read(path))
      return nil if yaml.respond_to?('key') and yaml.has_key?('enabled') and yaml['enabled'] == false
    else
      config = ''
    end
    
    return runCmd("node_modules/.bin/svgo.cmd #{config} -i - -o -", content)
  end

  def self.output_json(path, page, content)
    return content if page =~ /.min.json$/
    return JSON.dump(JSON.load(content))
  end
  
  def self.parse_error(path, content, e)
    warn "Warning: parse error in #{path}. Don't panic - copying initial file"
    warn "Details: #{e.message.strip}"
    return content
  end

  def self.compress(page)
    if page.is_a?(Page) or page.is_a?(StaticFile)
      dest_path = File.join(page.dir, page.name)
    elsif page.is_a?(Document)
      dest_path = page.path.slice(page.site.source.length+1..page.path.length)
    else
      return
    end
    
    if page.respond_to?('content')
      content = page.content
    elsif page.is_a?(BuiltPage)
      content = $static_output[page.path]
    else
      content = File.read(page.path)
    end
    
    return if content.length == 0 or exclude?(dest_path,
      page.site.config['jekyll-press'] && page.site.config['jekyll-press']['exclude'])
    checksum = Digest::SHA2.hexdigest(content)
    return if checksum == $min_checksum[page.path]
    $min_checksum[page.path] = checksum
    
    case File.extname(dest_path)
      when '.js'
        return output_js(dest_path, page, content)
      when '.css'
        return output_css(dest_path, page, content)
      when '.html'
        return output_html(dest_path, page, content)
      when '.svg'
        return output_svg(dest_path, page, content)
      when '.json'
        return output_json(dest_path, page, content)
      else
        return nil
    end
  end
  
  def self.doCompress(page)
    if page.site.config.key?('jekyll-press') and page.site.config['jekyll-press'].key?('enabled')
      return if not page.site.config['jekyll-press']['enabled']
    end
    content = compress(page)
    if not content.nil?
      if page.respond_to?('content')
        page.content = content
      end
      if page.respond_to?('output')
        page.output = content
      end
      if page.is_a?(StaticFile)
        $static_output[page.path] = content
      end
    end
  end
end

Jekyll::Hooks.register :pages, :post_render do |page|
  Jekyll::doCompress(page)
end

Jekyll::Hooks.register :site, :post_render do |site|
  site.static_files.each do |file|
    Jekyll::doCompress(file)
  end
end