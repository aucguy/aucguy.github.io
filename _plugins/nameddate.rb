MONTHS = ["January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"];

#converts a date with dashes to one with words
module Jekyll
  class DateBlock < Liquid::Block
    def initialize(tag_name, text, tokens)
      super
    end
    def render(context)
      begin
        year, month, day = super.split(' ')[0].split('-')
        "#{MONTHS[month.to_i-1]} #{day}, #{year}"
      rescue
        ""
      end
    end
  end
end
Liquid::Template.register_tag('date', Jekyll::DateBlock)