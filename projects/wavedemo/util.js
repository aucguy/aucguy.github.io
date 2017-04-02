base.registerModule("util",function(t){function e(t){return isNaN(t)||t==Number.POSITIVE_INFINITY||t==Number.NEGATIVE_INFINITY}t.invalidNum=e,t.trace=function(t,e){return function(){var n=(new Date).getTime();e.apply(this,arguments);var i=(new Date).getTime();console.log("function '"+t+"' took"+(i-n)/1e3+"seconds")}};var n=oldextend(Object,function(t,e){this.init(t,e)});n.prototype.init=function(t,e){this.live=!0,"undefined"!=typeof t&&(this._x=t,this._y=e,this.updateMd())},t.Vector=n,n.firstPool=null,n.get=function(t,e){return new n(t,e)},n.prototype.recycle=function(){if(!this.live)throw new Error("attempt to recycle a vector twice");this.live=!1,this.x=n.firstPool,this.live=!1,n.firstPool=this},n.createMd=function(t,e){var i=new n;return i.m=t,i.d=e,i},n.prototype._x=null,n.prototype._y=null,n.prototype._m=null,n.prototype._d=null,Object.defineProperty(n.prototype,"x",{get:function(){return this._x},set:function(t){this._x=t,this.updateMd()}}),Object.defineProperty(n.prototype,"y",{get:function(){return this._y},set:function(t){this._y=t,this.updateMd()}}),Object.defineProperty(n.prototype,"m",{get:function(){return this._m},set:function(t){this._m=t,this.updateXy()}}),Object.defineProperty(n.prototype,"d",{get:function(){return this._d},set:function(t){this._d=t,this.updateXy()}});const i=180/Math.PI,o=1/i;n.prototype.updateMd=function(){var t=this._x,e=this._y;this._m=Math.sqrt(t*t+e*e),this._d=Math.atan2(e,t)*i},n.prototype.updateXy=function(){this._x=Math.cos(this.d*o)*this.m,this._y=Math.sin(this.d*o)*this.m},n.prototype.add=function(t){return n.get(this.x+t.x,this.y+t.y)},n.prototype.sub=function(t){return n.get(this.x-t.x,this.y-t.y)},n.prototype.opposite=function(){return n.get(-this.x,-this.y)},n.prototype.increment=function(t){this.x+=t.x,this.y+=t.y},n.prototype.scale=function u(u){return n.get(this.x*u,this.y*u)},n.prototype.toString=function(){return"{x: "+this.x+", y: "+this.y+", m: "+this.m+", d: "+this.d+"}"},n.prototype.copy=function(){return n.get(this.x,this.y)},Dictionary=oldextend(Object,function(){this.entries=[]}),t.Dictionary=Dictionary,Dictionary.prototype.entries=null,Dictionary.prototype.get=function(t){return this.getEntry(t).value},Dictionary.prototype.contains=function(t){return null!=this.getEntry(t)},Dictionary.prototype.put=function(t,e){var n=this.getEntry(t);null==n?(n=new r(t,e),this.entries.push(n)):n.value=e},Dictionary.prototype.length=function(){return this.entries.length},Dictionary.prototype.getEntry=function(t){for(var e=0;e<this.entries.length;e++){var n=this.entries[e];if(n.key==t)return n}return null};var r=oldextend(Object,function(t,e){this.key=t,this.value=e});r.prototype.key=null,r.prototype.value=null,util.randInt=function(t,e){return Math.random()*(e-t)+t},util.randDegree=function(){return util.randInt(0,359)}});