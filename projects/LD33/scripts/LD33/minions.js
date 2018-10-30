base.registerModule("minions",function(i){var h=base.importModule("menu"),t=base.importModule("engine"),o=base.importModule("data"),r=base.importModule("main");function a(i,t){h.MenuPlay.instance.variables[i]=t}var e=base.extend(Object,"Minion",{constructor:function(){this.skillFarming=1,this.skillMining=1,this.skillCrafting=1,this.skillFighting=1,this.hp=o.MAX_HP,this.name="John Smith",this.healing=!1,this.equipment="none",this.spells=[]},syncSlot:function(i,t){var n=i+t;a(n+".name",this.name),a(n+".farmSkill",this.skillFarming),a(n+".mineSkill",this.skillMining),a(n+".craftSkill",this.skillCrafting),a(n+".fightSkill",this.skillFighting),a(n+".hp",this.hp),a(n+".equipment",this.equipment)},getSkillAtStation:function(i){var t=i.name;return"fields"==t?this.skillFarming:"mountains"==t?this.skillMining:"workshop"==t?this.skillCrafting:0},levelup:function(i,t){"fields"==i.name?this.skillFarming++:"mountains"==i.name?this.skillMining++:"workshop"==i.name?this.skillCrafting++:"caves"!=i.name||this.healing||this.skillFighting++,this.hp<o.MAX_HP&&(this.hp++,this.hp==o.MAX_HP&&(this.healing=!1)),this.syncSlot(i.name,t)},feed:function(i,t){var n=l.instance.stationFields;0===n.supplies.food?i.removeMinion(this):n.supplies.food--},getPower:function(){return this.skillFighting+this.getEquipmentBonus()},getToughness:function(){return this.hp+this.getEquipmentBonus()},getEquipmentBonus:function(){return"tin"==this.equipment?1:"copper"==this.equipment?2:"iron"==this.equipment?3:0},damage:function(i,t,n){this.hp-=n,this.hp<=0?i.removeMinion(this):(this.hp<o.MIN_CAVE_HP&&(this.healing=!0),this.syncSlot(i.name,t))}}),n=base.extend(Object,"Station",{constructor:function(i){this.name=i,this.maxMinions=4,this.minions=[],this.production=0,"fields"==this.name?(this.supplies={mana:20,food:20},this.producing={mana:0,food:0}):"mountains"==this.name?(this.supplies={tin:0,copper:0,iron:0},this.producing={tin:0,copper:0,iron:0}):"workshop"==this.name?(this.supplies={tinA:0,copperA:0,ironA:0},this.producing={tinA:0,copperA:0,ironA:0}):(this.supplies={},this.producing={}),this.removals=[],this.syncGui();for(var t=0;t<this.maxMinions;t++)this.clearSlot(t)},addMinion:function(i){return this.minions.length<this.maxMinions&&(this.minions.push(i),i.syncSlot(this.name,this.minions.length-1),this.calculateProduction(),this.syncGui(),!0)},removeMinion:function(i){this.removals.push(i)},flushRemovals:function(){var i;if(0!==this.removals.length){var t=l.instance.selectedSlot;for(i=0;i<this.removals.length;i++){var n=this.removals[i],s=this.minions.indexOf(n);-1!=s&&(null!==t&&this==t.station&&(s==t.slot?(t=null,l.instance.setSelectedSlot(t)):s<t.slot&&(t={station:t.station,slot:t.slot-1},l.instance.setSelectedSlot(t))),this.minions.splice(s,1))}for(i=0;i<this.minions.length;i++)this.minions[i].syncSlot(this.name,i);for(i=this.minions.length;i<this.maxMinions;i++)this.clearSlot(i);this.calculateProduction(),this.reduceProducing(),this.syncGui(),this.removals=[]}},reduceProducing:function(){for(;this.production<this.getTotalProducing();)if("fields"==this.name)if(0<this.producing.mana)this.producing.mana--;else{if(!(0<this.producing.food))break;this.producing.food--}else if("mountains"==this.name)if(0<this.producing.tin)this.producing.tin--;else if(0<this.producing.copper)this.producing.copper--;else{if(!(0<this.producing.iron))break;this.producing.iron--}else{if("workshop"!=this.name)break;if(0<this.producing.tinA)this.producing.tinA--;else if(0<this.producing.copperA)this.producing.copperA--;else{if(!(0<this.producing.ironA))break;this.producing.ironA--}}},clearSlot:function(i){var t=this.name+i;a(t+".name","null"),a(t+".farmSkill",0),a(t+".mineSkill",0),a(t+".craftSkill",0),a(t+".fightSkill",0),a(t+".hp",0),a(t+".equipment","none")},gatherSupplies:function(){if("fields"==this.name)this.supplies.mana+=this.producing.mana,this.supplies.food+=this.producing.food;else if("mountains"==this.name)this.supplies.tin+=this.producing.tin,this.supplies.copper+=this.producing.copper,this.supplies.iron+=this.producing.iron;else if("workshop"==this.name){var i,t=l.instance.stationMountains;0<t.supplies.tin&&(i=Math.min(this.producing.tinA,t.supplies.tin),t.supplies.tin-=i,this.supplies.tinA+=i),0<t.supplies.copper&&(i=Math.min(this.producing.copperA,t.supplies.copper),t.supplies.copper-=i,this.supplies.copperA+=i),0<t.supplies.iron&&(i=Math.min(this.producing.ironA,t.supplies.iron),t.supplies.iron-=i,this.supplies.ironA+=i),t.syncGui()}else if("caves"==this.name){for(var n=0;n<this.minions.length;n++){var s=this.minions[n],e=Math.random()-s.getEquipmentBonus();!s.healing&&e<o.CAVE_HURT&&s.damage(this,n,1)}this.flushRemovals()}this.syncGui()},levelupMinions:function(){for(var i=0;i<this.minions.length;i++)this.minions[i].levelup(this,i);this.calculateProduction(),this.syncGui()},feedMinions:function(){for(var i=0;i<this.minions.length;i++)this.minions[i].feed(this,i);this.flushRemovals()},calculateProduction:function(){for(var i=this.production=0;i<this.minions.length;i++)this.production+=this.minions[i].getSkillAtStation(this)},syncGui:function(){"fields"==this.name?(a("manaText",this.supplies.mana),a("foodText",this.supplies.food),a("plantText",this.producing.mana+"/"+this.producing.food)):"mountains"==this.name?(a("tinText",this.supplies.tin),a("copperText",this.supplies.copper),a("ironText",this.supplies.iron),a("oreText",this.producing.tin+"/"+this.producing.copper+"/"+this.producing.iron)):"workshop"==this.name&&(a("tinAText",this.supplies.tinA),a("copperAText",this.supplies.copperA),a("ironAText",this.supplies.ironA),a("armorText",this.producing.tinA+"/"+this.producing.copperA+"/"+this.producing.ironA)),a(this.name+".PP",this.getTotalProducing()+"/"+this.production),null!==l.instance&&l.instance.syncGui()},produceMore:function(i){this.producing[i]++,this.getTotalProducing()>this.production?this.producing[i]--:this.syncGui()},produceLess:function(i){0<this.producing[i]&&(this.producing[i]--,this.syncGui())},getTotalProducing:function(){return"fields"==this.name?this.producing.mana*o.PP_MANA+this.producing.food*o.PP_FOOD:"mountains"==this.name?this.producing.tin*o.PP_TIN+this.producing.copper*o.PP_COPPER+this.producing.iron*o.PP_IRON:"workshop"==this.name?this.producing.tinA*o.PP_TIN+this.producing.copperA*o.PP_COPPER+this.producing.ironA*o.PP_IRON:0}}),l=base.extend(t.Sprite,"Game",{constructor:function(){this.stationFields=new n("fields"),this.stationMountains=new n("mountains"),this.stationWorkshop=new n("workshop"),this.stationCaves=new n("caves"),this.stations=[this.stationFields,this.stationMountains,this.stationWorkshop,this.stationCaves],this.tickCount=0,this.selectedSlot=null,this.heroPower=7,this.heroHp=15,this.syncGui()},update:t.listener(t.EventTick.ID,function(i){this.tickCount++,this.tickCount%300==0&&this.gatherSupplies(),this.tickCount%1200==0&&(this.feedMinions(),this.levelupMinions())}),gatherSupplies:function(){for(var i=0;i<this.stations.length;i++)this.stations[i].gatherSupplies()},levelupMinions:function(){for(var i=0;i<this.stations.length;i++)this.stations[i].levelupMinions();this.heroPower+=Math.floor(this.tickCount/24e3)+5,this.heroHp+=Math.floor(this.tickCount/24e3)+5,this.syncGui()},feedMinions:function(){for(var i=0;i<this.stations.length;i++)this.stations[i].feedMinions()},setSelectedSlot:function(i){var t=this.selectedSlot;this.selectedSlot=i,null!==t&&a(t.station.name+t.slot+".selected",void 0),null!==i&&a(i.station.name+i.slot+".selected",!0)},getSelectedMinion:function(){return null===this.selectedSlot?null:this.selectedSlot.station.minions[this.selectedSlot.slot]},syncGui:function(){for(var i=0,t=25,n=0;n<this.stations.length;n++)for(var s=this.stations[n],e=0;e<s.minions.length;e++){var o=s.minions[e];i+=o.getPower(),t+=o.getToughness()}a("playerText",i+"/"+t),a("heroText",this.heroPower+"/"+this.heroHp),a("difference",this.heroPower-i+"/"+(this.heroHp-t)),i>this.heroPower&&t>this.heroHp?r.menuManager.setMenu(new h.MenuPlay("gui/win")):this.heroPower>i&&this.heroHp>t&&r.menuManager.setMenu(new h.MenuPlay("gui/lose"))}});function u(){var i=new e,t=l.instance.stations,n=l.instance.stationFields;if(!(n.supplies.mana<o.COST_SUMMON))for(var s=0;s<t.length;s++){if(t[s].addMinion(i))return n.supplies.mana-=o.COST_SUMMON,void n.syncGui()}}function p(i,t){return function(){i.produceMore(t)}}function c(i,t){return function(){i.produceLess(t)}}function d(t,n){return function(){if(t.minions.length>n){var i={station:t,slot:n};l.instance.setSelectedSlot(i)}}}function m(t){return function(){var i=l.instance.getSelectedMinion();null!==i&&(l.instance.selectedSlot.station.removeMinion(i),l.instance.selectedSlot.station.flushRemovals(),t.addMinion(i))}}function g(s){return function(){var i=l.instance.getSelectedMinion();if(null!==i){var t=l.instance.stationWorkshop.supplies;if(0<t[s+"A"]){t[s+"A"]--,i.equipment=s;var n=l.instance.selectedSlot;i.syncSlot(n.station.name,n.slot),l.instance.syncGui()}}}}function f(){l.instance.parentGroup.removeSprite(l.instance),r.menuManager.setMenu(new h.MenuPlay("gui/instructions"))}(i.Game=l).prototype.compile(),l.instance=null,i.init=function(){l.instance=new l,a("summon",u);var i,t,n,s=l.instance,e=[["Fields","mana","food"],["Mountains","tin","copper","iron"],["Workshop","tinA","copperA","ironA"]];for(t=0;t<e.length;t++)for(i=s["station"+e[t][0]],n=1;n<e[t].length;n++){var o=e[t][n];a(o+"Up",p(i,o)),a(o+"Down",c(i,o))}for(t=0;t<s.stations.length;t++)for(i=s.stations[t],n=0;n<i.maxMinions;n++)a(i.name+n+".box",d(i,n));for(t=0;t<s.stations.length;t++)a((i=s.stations[t]).name+"Move",m(i));var h=["tin","copper","iron"];for(t=0;t<h.length;t++){var r=h[t];a(r+"Equip",g(r))}a("instructions",f)}});