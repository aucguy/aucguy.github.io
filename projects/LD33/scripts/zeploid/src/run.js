base.registerModule("run",function(n){var o=base.importModule("resource");base.importModule("main");var r="display";n.SCREEN_WIDTH=null;var i=n.SCREEN_HEIGHT=null;function e(){if(a(),n.initDone&&0===o.getLoading()){t=base.importModule("engine"),n.SCREEN_WIDTH=document.getElementById(r).width,n.SCREEN_HEIGHT=document.getElementById(r).height,t.DISPLAY_ID=r,t.init(),t.World.prototype.handleError=function(e,t){console.error("error occured when handling event "+t),base.onError(e)},n.onInit(),base.clearInterval(i);var e=base.importModule("engine");base.setInterval(e.tick,1/30)}var t}function a(){var e=document.getElementById(r),t=e.getContext("2d");t.fillStyle="#000000",t.fillRect(0,0,e.width,e.height),t.textBaseline="top",t.font="72px Arial",t.strokeStyle="#FFFFFF";var n,o=t.measureText("loading..."),i=Math.floor((new Date).getTime()%3e3/1e3);n=0===i?"loading.":1==i?"loading..":"loading...",t.strokeText(n,e.width/2-o.width/2,e.height/2-36)}n.onInit||(n.onInit=function(){}),n.initDone||(n.initDone=!1),a(),i=base.setInterval(e,1)});