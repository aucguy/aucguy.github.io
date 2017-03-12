module Jekyll
  def self.removeFiles(site)
    config = site.config['ignore-file'] && site.config['ignore-file']['exclude']
    site.static_files = site.static_files.select {|file| not exclude?(File.join(file.dir, file.name), config)}
  end
  
  def self.doRemoveFiles(site)
    begin
      removeFiles(site)
    rescue Exception => e
      puts(e.message)
      puts(e.backtrace)
      raise e
    end
  end
end

Jekyll::Hooks.register :site, :post_render do |site|
  Jekyll::doRemoveFiles(site)
end