"use strict";base.registerModule("main",function(u){var e=base.importModule("run"),n=base.importModule("resource");u.menuManager=null,e.onInit=function(){var e=base.importModule("engine"),n=base.importModule("menu"),a=base.importModule("gui"),i=base.importModule("data"),o=base.importModule("minions");i.init(),new n.MenuPlay("gui/play"),o.init();var t=new a.MenuManager;(u.menuManager=t).setMenu(n.MenuPlay.instance),e.World.instance.addSprite(t),e.World.instance.addSprite(o.Game.instance)},n.setResourcePath(""),n.loadJson("index","assets/index.json",null,n.query),e.initDone=!0});