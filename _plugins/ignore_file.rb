#removes specificed files from the website
module Jekyll
  def self.removeFiles(site)
    config = site.config['ignore-file'] && site.config['ignore-file']['exclude']
    site.static_files = site.static_files.select {|file| not exclude?(File.join(file.dir, file.name), config)}
  end
end

Jekyll::Hooks.register :site, :post_render do |site|
  Jekyll::removeFiles(site)
end