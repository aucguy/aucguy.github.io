base.registerModule("engine",function(e){function t(e,t){var n=document.createElement("canvas");n.width=e,n.height=t;var s=n.getContext("2d");return s.fillStyle="rgba(0,0,0,0)",s.fillRect(0,0,e,t),n}function n(){var e=base.extend(h,"",{constructor:function(t){this.constructor$EventKey(t,e.keybindings[t])}});return h.registerIds(e),e}function s(e,t){return t._$event_id=e,t}function i(e){for(var t=1;9>t;t++)if(navigator.appVersion.indexOf("rv:"+t)>-1)return 1==e;return 0===e}e.DISPLAY_ID=null,e.init=function(){x.instance=new x,x.instance.init()},e.makeCanvas=t,e.loadImage=function(e,n,s){var i=t(e,n),r=i.getContext("2d"),o=new Image;return o.addEventListener("load",function(t){r.clearRect(0,0,e,n),r.drawImage(o,0,0)}),o.src=s,i};var r=base.extend(Object,"Event",{constructor:function(e){this.id=e,this.canceled=!1},id:null,canceled:null});r.current_id=0,e.Event=r,r.nextEventId=function(){return r.current_id++};var o=base.extend(r,"EventMouse",{constructor:function(e,t,n){this.constructor$Event(n),this.x=e,this.y=t},x:null,y:null});e.EventMouse=o;var u=base.extend(o,"EventMouseDown",{constructor:function(e,t){this.constructor$EventMouse(e,t,u.ID)}});e.EventMouseDown=u,u.ID=r.nextEventId();var c=base.extend(o,"EventMouseUp",{constructor:function(e,t){this.constructor$EventMouse(e,t,c.ID)}});e.EventMouseUp=c,c.ID=r.nextEventId();var d=base.extend(o,"EventMouseMove",{constructor:function(e,t){this.constructor$EventMouse(e,t,d.ID)}});e.EventMouseMove=d,d.ID=r.nextEventId();var h=base.extend(r,"EventKey",{constructor:function(e,t){this.constructor$Event(t),this.key=e}});e.EventKey=h,h.prototype.key=null,h.keys=["W","A","S","D"," SPACE","192:GRAVE"],h.registerIds=function(e){e.keybindings={};for(var t=0;t<h.keys.length;t++){var n,s=h.keys[t],i=s.indexOf(":");n=i>0?parseInt(s.slice(0,i)):s[0].toUpperCase().charCodeAt(0);var o;o=1==s.length?s.toUpperCase():1>i?s.slice(1,s.length).toUpperCase():s.slice(i+1);var u=r.nextEventId();e["ID_"+o]=u,e.keybindings[n]=u}};var a=n();e.EventKeyDown=a;var p=n();e.EventKeyUp=p;var l=n();e.EventKeyPressed=l;var v=base.extend(r,"EventTick",{constructor:function b(e){this.constructor$Event(b.ID),this.tickCount=e}});e.EventTick=v,v.ID=r.nextEventId();var f=base.extend(r,"EventRender",{constructor:function C(e){this.constructor$Event(C.ID),this.context=e},context:null});e.EventRender=f,f.ID=r.nextEventId();var y=base.extend(r,"EventAdded",{constructor:function(e){this.constructor$Event(y.ID),this.group=e},group:null});e.EventAdded=y,y.ID=r.nextEventId();var E=base.extend(r,"EventRemoved",{constructor:function(e){this.constructor$Event(E.ID),this.group=e},group:null});e.EventRemoved=E,E.ID=r.nextEventId();var g=base.extend(r,"EventCompilePassers",{constructor:function(){this.constructor$Event(g.ID)}});e.EventCompilePassers=g,g.ID=r.nextEventId(),e.listener=s;var I=base.extend(Object,"Sprite",{constructor:function(){this.references=0,this.parentGroup=null},handlers:{},parentGroup:null,onEvent:function(e){this.handlers.hasOwnProperty(e.id)&&this.handlers[e.id](this,e)},compile:function(){"use strict";var e={};for(var t in this)if(-1==t.indexOf("$")){var n=this[t];"function"==typeof n&&"undefined"!=typeof n._$event_id&&("undefined"==typeof e[n._$event_id]&&(e[n._$event_id]=[]),e[n._$event_id].push(n),n.$name=t)}this.handlers={};for(var s in e){for(var i=e[s],r=[],o=0;o<i.length;o++){var u=i[o];r.push("s."),r.push(u.$name),r.push("(e);")}this.handlers[s]=new Function("s","e",r.join(""))}},onAdded:s(y.ID,function(e){this.parentGroup=e.group}),onRemoved:s(E.ID,function(e){this.parentGroup=null})});I.prototype.compile(),e.Sprite=I;var D=base.extend(I,"Group",{constructor:function(){this.constructor$Sprite(),this.sprites=[],this.spriteDeltas=[],this.dirty=!0},sprites:null,dirty:!1,spriteDeltas:null,addSprite:function(e){this.spriteDeltas.push({type:0,sprite:e}),this.dirty=!0,x.instance.addDirtyGroup(this)},removeSprite:function(e){var t=this.sprites.indexOf(e);-1!=t&&(this.spriteDeltas.push({type:1,sprite:e}),this.dirty=!0,x.instance.addDirtyGroup(this))},forEachSprite:function(e){for(var t=0;t<this.sprites.length;t++)e(this.sprites[t])},compilePassers:function(){this.compile$Sprite(),this.listeners=this.handlers;var e,t={};for(e in this.listeners)t[e]=["var x;s.listeners[",e,"](s,e);"];for(var n=0;n<this.sprites.length;n++){var s=this.sprites[n];s instanceof D&&s.dirty&&s.refresh();for(e in s.handlers)"undefined"==typeof t[e]&&(t[e]=["var x;"]),t[e].push("x=s.sprites["),t[e].push(n),t[e].push("];x.handlers["),t[e].push(e),t[e].push("](x,e);")}this.handlers={};for(e in t)this.handlers[e]=new Function("s","e",t[e].join(""))},refresh:function(){for(var e=0;e<this.spriteDeltas.length;e++){var t=this.spriteDeltas[e];0===t.type?(this.sprites.push(t.sprite),t.sprite.onEvent(new y(this))):(this.sprites.splice(this.sprites.indexOf(t.sprite),1),t.sprite.onEvent(new E(this)))}this.spriteDeltas=[],this.compilePassers(),this.dirty=!1,null!==this.parentGroup&&x.instance.addDirtyGroup(this.parentGroup)}});e.Group=D;var m=base.extend(D,"SegmentedGroup",{constructor:function(e){this.constructor$Group(),this.segmentSize=Math.sqrt(e)},segmentSize:null,addSprite:function(e){(0===this.sprites.length||this.sprites[this.sprites.length-1].sprites.length>=this.segmentSize)&&this.addSprite$Group(new D),this.sprites[this.sprites.length-1].addSprite(e)},removeSprite:function(e){for(var t=0;t<this.sprites.length;t++){var n=this.sprites[t];if(-1!=n.sprites.indexOf(e))return void n.removeSprite(e)}},forEachSprite:function(e){for(var t=0;t<this.sprites.length;t++)this.sprites[t].forEachSprite(e)}});e.SegmentedGroup=m;var x=base.extend(D,"World",{constructor:function G(){this.constructor$Group(),this.dirtyGroups=[],this.inter=new w,this.tickCount=0,G.instance=this;var t=this,n=document.getElementById(e.DISPLAY_ID);base.addListener(n,"mousedown",function(e){t.handleMouseDown(e)}),base.addListener(n,"mousemove",function(e){t.handleMouseMove(e)}),base.addListener(n,"mouseup",function(e){t.handleMouseUp(e)}),base.addListener(n,"keydown",function(e){t.handleKeyDown(e)}),base.addListener(n,"keyup",function(e){t.handleKeyUp(e)}),base.addListener(n,"blur",function(e){t.handleBlur(e)})},mouseDown:!1,dirtyGroups:null,inter:null,init:function(){this.addSprite(this.inter)},handleError:function(e,t){},addDirtyGroup:function(e){-1==this.dirtyGroups.indexOf(e)&&this.dirtyGroups.push(e)},refreshListeners:function(){for(var e=0;e<this.dirtyGroups.length;e++)this.dirtyGroups[e].refresh();this.dirtyGroups=[]},tick:function(){this.refreshListeners(),this.onEvent(new v(this.tickCount++))},render:function(e){e.fillStyle="#000000",e.fillRect(0,0,e.canvas.width,e.canvas.height),this.onEvent(new f(e))},handleMouseDown:function(t){if(i(t.button)){this.mouseDown=!0;var n=t.clientX-document.getElementById(e.DISPLAY_ID).getBoundingClientRect().left,s=t.clientY-document.getElementById(e.DISPLAY_ID).getBoundingClientRect().top;this.onEvent(new u(n,s))}},handleMouseMove:function(t){var n=t.clientX-document.getElementById(e.DISPLAY_ID).getBoundingClientRect().left,s=t.clientY-document.getElementById(e.DISPLAY_ID).getBoundingClientRect().top;this.onEvent(new d(n,s))},handleMouseUp:function(t){if(i(t.button)){this.mouseDown=!1;var n=t.clientX-document.getElementById(e.DISPLAY_ID).getBoundingClientRect().left,s=t.clientY-document.getElementById(e.DISPLAY_ID).getBoundingClientRect().top;this.onEvent(new c(n,s))}},handleKeyDown:function(e){this.inter.onKeyDown(e),this.onEvent(new a(e.keyCode))},handleKeyUp:function(e){this.inter.onKeyUp(e),this.onEvent(new p(e.keyCode))},handleBlur:function(e){this.inter.onBlur(e)}});e.World=x,x.instance=null;var S=base.extend(I,"SimpleGraphic",{constructor:function(e,t,n){I.call(this),this.canvas=e,this.x=t,this.y=n},canvas:null,x:null,y:null,render:s(f.ID,function(e){e.context.drawImage(this.getCanvas(),this.getX(),this.getY())}),getCanvas:function(){return this.canvas},getX:function(){return this.x},getY:function(){return this.y}});e.SimpleGraphic=S,S.prototype.compile(S);var w=base.extend(I,"Interface",{constructor:function(){this.constructor$Sprite(),this.mouseX=0,this.mouseY=0,this.pressedKeys=[]},mouseX:null,mouseY:null,pressedKeys:null,onMouseMove:s(d.ID,function(e){this.mouseX=e.x,this.mouseY=e.y}),onKeyDown:function(e){-1==this.pressedKeys.indexOf(e.keyCode)&&this.pressedKeys.push(e.keyCode)},onKeyUp:function(e){-1!=this.pressedKeys.indexOf(e.keyCode)&&this.pressedKeys.splice(this.pressedKeys.indexOf(e.keyCode),1)},onBlur:function(e){this.pressedKeys=[]},onTick:s(v.ID,function(e){for(var t=0;t<this.pressedKeys.length;t++)this.parentGroup.onEvent(new l(this.pressedKeys[t]))})});e.Interface=w,w.prototype.compile(),e.tick=function(){x.instance.tick(),x.instance.render(document.getElementById(e.DISPLAY_ID).getContext("2d"))}});