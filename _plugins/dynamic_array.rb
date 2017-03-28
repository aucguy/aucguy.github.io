#a limited functionality array where objects can be appended without sizing
#of the underlying array. Appending is faster for this than for the builtin
#Array type.
module Jekyll
  #An internal class that is supposed to store 1000 objects
  class DynamicArrayNode
    #value - the array that stores objects
    #position - the next place to store an object upon appending or 1000 if full
    #right - the next DynamicArrayNode in the linked list
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
  #This is implemented by having a singly linked list of arrays.
  class DynamicArray
    def initialize()
      @first = nil
      @last = nil
      @size = 0
    end
    
    def append(value)
      #a new node needs to be created
      if @last.nil? or @last.full
        node = DynamicArrayNode.new
        if @last.nil?
          #none created, this is the first one
           @first = node
        elsif @last.full
          #last one was full, add a new one
          @last.right = node
        end
        @last = node
      end
      #add onto end
      @last.append(value)
      @size += 1
    end
    
    def to_array()
      array = Array.new(size=@size)
      node = @first
      i = 0
      #iterate over all the nodes
      until node.nil?
        #iterate over all elements that are being used
        (node.position).times do |k|
          array[i] = node.value[k]
          i += 1 #go forward one element in the output
        end
        node = node.right
      end
      array
    end
  end
end