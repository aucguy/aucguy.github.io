require 'find'

module Jekyll
  class BuiltPage < StaticFile
    #allows the setting of the @path property

    def initialize(site, source, path)
      super(site, source, File.dirname(path), File.basename(path))
    end

    def modified_time
      0 #never gets modified
    end
  end

  def self.build(site)
    if site.config['output-build'] and site.config['output-build'].respond_to?('each')
      #iterate through each repository
      site.config['output-build'].each do |entry|
        if entry.respond_to?('[]') and not entry['dir'].nil? and not entry['cmd'].nil? and not entry['build'].nil? and not entry['output'].nil?
          system("chdir #{entry['dir']} & #{entry['cmd']}")
          build_dir = File.join(site.source, entry['dir'], entry['build'])
          #copy the files by registering them with the site
          Find.find(build_dir) do |file|
            if File.file?(file)
              #file is the full path so it needs to be relativized with build_dir
              path = File.join(entry['output'], file[build_dir.length, file.length - build_dir.length])
              page = BuiltPage.new(site, site.source, path)
              $static_output[page.path] = read_file(file)
              site.static_files << page
            end
          end
        end
      end
    end
  end

  def self.doBuild(site)
    begin
      build(site)
    rescue Exception => e
      puts(e.message)
      puts(e.backtrace)
      raise e
    end
  end
end

Jekyll::Hooks.register :site, :post_read do |site|
  Jekyll::doBuild(site)
end