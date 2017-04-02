base.registerModule("gui",function(t){var e=base.importModule("engine");t.init=function(){o.instance=new o,e.World.instance.addSprite(o.instance)};var n=base.extend(e.Group,"Menu",{constructor:function(){this.constructor$Group(),this.addElements()},addElements:function(){}});t.Menu=n,EventButtonClick=base.extend(e.Event,"EventButtonClick",{constructor:function s(){this.constructor$Event(s.ID)}}),EventButtonClick.ID=e.Event.nextEventId();var i=base.extend(e.SimpleGraphic,"Button",{constructor:function(t,n,i,r){function o(t,e){var n=["x","y","width","height"],i=s.getElementById(t);i.parentNode.removeChild(i);var r=xml.copyAttributes(xml.ensureType(i,e),n),o=new util.Rect(safeParseInt(r.x),safeParseInt(r.y),safeParseInt(r.width),safeParseInt(r.height));return o}this.constructor$SimpleGraphic(e.makeCanvas(200,100),n,i),this.rect=new util.Rect(-1,-1,-1,-1),this.text=r;var s=resource.getResource("gui/button.svg");xml.removeMetadata(s);var a=o("leftrect","rect"),u=o("midrect","rect"),c=o("rightrect","rect"),h=new util.Rect(-1,-1,-1,-1),l=s.getElementById("text");l.parentNode.removeChild(l),h.left=l.getAttribute("x"),h.top=l.getAttribute("y");var d=e.makeCanvas(1,1).getContext("2d");d.font="20px Georgia",d.textBaseline="top";for(var v=0;v<l.childNodes.length;v++)if("tspan"==l.childNodes[v].nodeName){var p=d.measureText(l.innerHTML);h.width=p.width}var g=h.left-a.left,f=parseInt(s.getElementsByTagName("svg")[0].getAttribute("width")),m=parseInt(s.getElementsByTagName("svg")[0].getAttribute("height")),w=e.makeCanvas(f,m);w.getContext("2d").drawSvg(s,0,0,f,m),s=null;var x=visual.clipCanvas(w,a.left,a.top,a.width,a.height),C=visual.clipCanvas(w,u.left,u.top,u.width,u.height),y=visual.clipCanvas(w,c.left,c.top,c.width,c.height);t=e.makeCanvas(0,x.height);var M=t.getContext("2d"),b=xml.copyAttributesFromStyle(l.getAttribute("style"),["font-size","font-family"]);b.font=b["font-size"]+" "+b["font-family"],M.font=b.font,M.textBaseline="bottom";var B=Math.ceil((M.measureText(this.text).width+g)/C.width);t.width=x.width+B*C.width+y.width,M.font=b.font,M.textBaseline="bottom",M.drawImage(x,0,0);var E=x.width;for(v=0;B>v;v++)M.drawImage(C,E,0),E+=C.width;M.drawImage(y,E,0),M.strokeStyle="#000000",M.strokeText(this.text,a.left+g,h.top),this.canvas=t,this.rect.left=this.getX(),this.rect.top=this.getY(),this.rect.width=this.canvas.width,this.rect.height=this.canvas.height},onMouseDown:e.listener(e.EventMouseDown.ID,function(t){this.rect.collidepoint(t.x,t.y)&&this.onEvent(new EventButtonClick(this))})});t.Button=i,i.prototype.rect=null,i.prototype.text=null,i.prototype.compile();var r=base.extend(i,"ButtonMenuChange",{constructor:function(t,e,n,i,r){this.constructor$Button(t,e,n,i),this.menuConstr=r},onClicked:e.listener(EventButtonClick.ID,function(t){o.instance.setMenu(new this.menuConstr)})});t.ButtonMenuChange=r,r.prototype.menuConstr=null,r.prototype.compile();var o=base.extend(e.Group,"MenuManager",{constructor:function(){this.constructor$Group(),this.currentMenu=null},setMenu:function(t){0!=this.currentMenu&&this.removeSprite(this.currentMenu),null!==t&&this.addSprite(t),this.currentMenu=t}});t.MenuManager=o,o.instance=null,o.prototype.currentMenu=null});