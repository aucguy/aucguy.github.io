module Jekyll
  class DynamicArrayNode
    attr_reader :value, :position
    attr_accessor :right
    
    def initialize
      @value = Array.new(size=1000)
      @position = 0
      @right = nil
    end
    
    def append(value)
      @value[@position] = value
      @position += 1
    end
    
    def full
      @position == @value.length
    end
  end
  
  #an array where appending elements is inexpensive
  class DynamicArray
    def initialize()
      @first = nil
      @last = nil
      @size = 0
    end
    
    def append(value)
      if @last.nil? or @last.full
        node = DynamicArrayNode.new
        if @last.nil?
           @first = node
        elsif @last.full
          @last.right = node
        end
        @last = node
      end
      @last.append(value)
      @size += 1
    end
    
    def to_array()
      array = Array.new(size=@size)
      node = @first
      i = 0
      until node.nil?
        (node.position).times do |k|
          array[i] = node.value[k]
          i += 1
        end
        node = node.right
      end
      array
    end
  end
end