#functions shared between plugins
module Jekyll
  #files that are binary. More may be necessary
  BINARY_FILES = ['.png']
  
  #determines whether or not a file is binary
  def self.file_mode(path)
    if BINARY_FILES.include?(File.extname(path))
      'b'
    else
      ''
    end
  end
  
  #reads a file using the correct mode (text or binary)
  def self.read_file(path)
    content = nil
    File.open(path, 'r' + file_mode(path)) do |file|
      content = file.read()
    end
    return content
  end

  #writes a file using the correct mode (text or binary)
  def self.write_file(path, content)
    FileUtils.mkdir_p(File.dirname(path))
    File.open(path, 'w' + file_mode(path)) do |file|
    file.write(content)
    end
  end
  
  #determines if the exclusion config specifies for the exclusion of the path
  def self.exclude?(dest_path, exclude)
    res = false
    if exclude
      if exclude.is_a? String
        exclude = [exclude]
      end
      exclude.each do |e|
        if e == dest_path || File.fnmatch(e, dest_path)
          res = true
          break
        end
      end
    end
    res
  end
  
  #runs a command with the given stdin and returns the stdout
  def self.runCmd(cmd, input)
    output = nil
    Open3.popen3(cmd) do |stdin, stdout, stderr, wait_thr|
      wait_thr.pid
      if not input.nil?
        stdin.write(input)
      end
      stdin.close
      output = stdout.read
      wait_thr.value
    end
    return output
  end

  #gets the config value
  def self.config_value(site, key1, key2)
    site.config[key1] && site.config[key1][key2]
  end
end