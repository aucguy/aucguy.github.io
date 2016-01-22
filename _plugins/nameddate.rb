MONTHS = ["January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"];

module Jekyll
  class DateBlock < Liquid::Block
    def initialize(tag_name, text, tokens)
      super
    end
    def render(context)
      begin
        content = super
        date = content.split(' ')[0];
        year, month, day = date.split('-')
        return MONTHS[month.to_i-1]+" "+day+", "+year
      rescue
        return ""
      end
    end
  end
end
Liquid::Template.register_tag('date', Jekyll::DateBlock)