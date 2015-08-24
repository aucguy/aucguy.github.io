base.registerModule('xml', function(module) {
  /**
   * taken from canvg.js parses xml
   */
  module.parseXml = function(xml) {
    if (window.DOMParser) {
      var parser = new DOMParser();
      var r = parser.parseFromString(xml, 'text/xml');
      return r;
    } else {
      xml = xml.replace(/<!DOCTYPE svg[^>]*>/, '');
      var xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
      xmlDoc.async = 'false';
      xmlDoc.loadXML(xml);
      return xmlDoc;
    }
  };

  /**
   * copy attributes from a DOM element to a normal javascript object
   * --arguments-- element - the DOM element to copy from attrs - an array of
   * strings representing property names to copy and to copy to --returns-- a
   * javascript object ret[property] == DOM.attributes.getNamedItem(property)
   */
  module.copyAttributes = function(element, attrs) {
    var obj = {};
    for (var i = 0; i < attrs.length; i++) {
      var name = attrs[i];
      var value = element.getAttribute(name);
      obj[name] = value;
    }
    return obj;
  };

  /**
   * does exactly the same thing as copyAttributes, just with a style
   */
  module.copyAttributesFromStyle = function(style, attrs) {
    var obj = {};
    var pairs = style.split(";");
    for (var i = 0; i < pairs.length; i++) {
      var parts = pairs[i].split(":");
      if (parts.length == 2) {
        var key = parts[0];
        var value = parts[1];
        if (attrs.indexOf(key) != -1) {
          obj[key] = value;
        }
      }
    }
    return obj;
  };
  
  /**
   * parses CSS inline styles
   */
  module.parseStyle = function(style, splitChar) {
    var obj = {};
    var pairs = style.split(splitChar);
    for (var i = 0; i < pairs.length; i++) {
      var parts = pairs[i].split(":");
      if (parts.length == 2) {
        obj[parts[0]] = parts[1];
      }
    }
    return obj;
  };

  /**
   * makes sure a DOM element is a certain type. If the element is of the
   * incorrect type, this function will raise a TypeError. this will not work
   * cross frame of browser! --arguements-- element - the DOM element whose
   * type is to be checked types - an array of names or a name of DOM types
   * that the element can be --returns-- the element passed in as an arguement
   */
  module.ensureType = function(element, types) {
    if (types instanceof Array) {
      for (var i = 0; i < types.length; i++) {
        var type = types[i];
        if (element.nodeName.toLowerCase() == type.toLowerCase()) {
          return element;
        }
      }
      throw new Error("element" + element + "is of incorrect DOM type");
    } else {
      if (element.nodeName.toLowerCase() != types.toLowerCase()) {
        throw new Error("element" + element + "is of incorrect DOM type");
      }
      return element;
    }
  };

  /**
   * removes first metadata tag of a document
   */
  module.removeMetadata = function(dom) {
    var metadata = dom.getElementsByTagName("metadata")[0];
    if(metadata !== null && metadata !== undefined) {
      metadata.parentNode.removeChild(metadata);
    }
  };
});