require 'find'
require 'yaml'

module Jekyll
  class BuiltPage < StaticFile
    def initialize(site, source, path)
      super(site, source, File.dirname(path), File.basename(path))
    end

    def modified_time
      0 #never gets modified
    end
  end

  def self.load_config(site)
    if File.exist?('_config/output_build.yml')
      return YAML.load(read_file(File.join(site.source, '_config/output_build.yml')))
    else
      return {}
    end
  end

  def self.store_config(site, config)
    write_file(File.join(site.source, '_config/output_build.yml'), YAML.dump(config))
  end

  def self.get_info(entry)
    time = 0
    files = DynamicArray.new
    Find.find(entry['dir']) do |file|
      if exclude?(file, entry['exclude'])
        Find.prune
      end
      if File.file?(file)
        files.append(file)
        mtime = File.mtime(file).to_i
        if mtime > time
          time = mtime
        end
      end
    end
    file_list = files.to_array
    file_list.sort
    #'|' is an invalid filename character on windows
    return {
      'last_time' => time,
      'content_hash' => Digest::SHA2.hexdigest(file_list.join('|'))
    }
  end

  def self.is_dirty(config, dir, info)
    return true if not config.has_key?(dir)
    info['last_time'] > config[dir]['last_time'] or info['content_hash'] != config[dir]['content_hash']
  end

  def self.build(site)
    config = load_config(site)
    new_config = {}

    if site.config['output-build'] and site.config['output-build'].respond_to?('each')
      #iterate through each repository
      site.config['output-build'].each do |entry|
        info = get_info(entry)
        #why does this need to be in parenthesis in order towork?
        enabled = (entry['enabled'].nil? or entry['enabled'])
        valid = (entry.respond_to?('[]') and not entry['dir'].nil? and
           not entry['cmd'].nil? and not entry['build'].nil? and
           not entry['output'].nil? and enabled)

        if valid
          if is_dirty(config, entry['dir'], info)
            system("chdir #{entry['dir']} & #{entry['cmd']}")
          end

          build_dir = File.join(site.source, entry['dir'], entry['build'])
          Find.find(build_dir) do |file|
            if File.file?(file)
              #file is the full path so it needs to be relativized with build_dir
              path = File.join(entry['output'], file[build_dir.length, file.length - build_dir.length])
              page = BuiltPage.new(site, site.source, path)
              $static_output[page.path] = read_file(file)
              site.static_files << page
            end
          end
          new_config[entry['dir']] = get_info(entry)
        else
         new_config[entry['dir']] = config[entry['dir']]
        end
      end
    end
    store_config(site, new_config)
  end
end

Jekyll::Hooks.register :site, :post_read do |site|
  Jekyll::build(site)
end