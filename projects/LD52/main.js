(()=>{"use strict";class e extends Phaser.Scene{create(){const e=this.cameras.main.width,t=this.cameras.main.height;this.add.image(e/2,t/2,"background").scale=.5,this.add.rectangle(e/2,t/2,e,t,0,.5),s(this,"Play!",e/2,t/2,"play")}}class t extends Phaser.Scene{create(e){const t=this.cameras.main.width,a=this.cameras.main.height;this.add.rectangle(0,0,t,a,0,.5).setOrigin(0),s(this,"You Lost!",t/2,a/2-80,null),s(this,"Score: "+e.score,t/2,a/2,null),s(this,"Play Again!",t/2,a/2+80,"play")}}function s(e,t,s,a,i){const n=e.add.image(s,a,"button");e.add.bitmapText(s,a-4,"font",t,32).setOrigin(.5),n.scale=4,n.setInteractive(),null!==i&&n.addListener("pointerdown",(()=>{e.game.scene.stop(e),e.game.scene.start(i)}))}const a=16,i=16;function n(e,t){t.cameraFilter=4294967295^e.id}function r(e,t){const s=[];for(let n=-32;n<=32;n+=a)for(let r=-32;r<=32;r+=i)if(Math.sqrt(n*n+r*r)<32){const h=e-n,o=t-r,l=Math.floor(h/a),d=Math.floor(o/i);s.push([l,d])}return s}class h{constructor(e){const{scene:t,camera:s,x:a,y:i,stat:r}=e;this.stat=r,this.sprites=[];for(let e=0;e<this.stat.max;e++){const r=t.add.sprite(0,i,"heart");r.scale=2,r.x=a+e*(2+r.displayWidth),n(s,r),this.sprites.push(r)}}update(){for(let e=0;e<this.stat.max;e++)e<this.stat.level?this.sprites[e].play("full"):this.sprites[e].play("empty")}}class o{constructor(e){const{scene:t,camera:s,x:a,y:i,stat:r,icon:h}=e;this.stat=r;const o=t.add.image(a,i,h);o.scale=2,n(s,o),this.digit=t.add.bitmapText(a+o.displayWidth,i-Math.round(o.displayHeight/4),"font",this.stat.level+"",32),n(s,this.digit)}update(){this.digit.text=this.stat.level+""}}class l{constructor(e,t){this.camera=e.cameras.add(0,0,e.cameras.main.width,e.cameras.main.height);const s=e.add.image(0,448,"hudBackground");s.scale=4,s.setOrigin(0);const a=this.camera.height,n=e.map.getHeight(),r=e.cameras.main.zoom,l=a-(a-i*n*r)/2;this.healthBar=new h({scene:e,camera:this.camera,x:32,y:l,stat:t.health}),this.foodDisplay=new o({scene:e,camera:this.camera,x:this.camera.width/2,y:l,icon:"carrot",stat:t.food})}update(){this.healthBar.update(),this.foodDisplay.update()}}const d=Phaser.Input.Keyboard.KeyCodes.W,m=Phaser.Input.Keyboard.KeyCodes.A,c=Phaser.Input.Keyboard.KeyCodes.S,p=Phaser.Input.Keyboard.KeyCodes.D,u=[-1,2];class g extends Phaser.Scene{constructor(){super(),this.keyboard=null,this.player=null,this.hud=null,this.turns=0,this.events=null,this.explosions=0}create(){this.cameras.main.centerOn(160,120),this.physics.world.setBounds(0,0,320,240),this.cameras.main.setZoom(4),this.keyboard=new f(this,[d,m,c,p]),this.map=new y(this,this.cameras.main),this.player=new x({scene:this,camera:this.cameras.main,keyboard:this.keyboard,map:this.map,x:5,y:3}),this.hud=new l(this,this.player),this.cameras.main.scrollX-=8*this.map.getWidth(),this.cameras.main.scrollY-=8*this.map.getHeight(),this.turns=0,this.explosions=0,this.events=new Map;for(let e=0;e<this.map.getWidth();e++)for(let t=0;t<this.map.getHeight();t++)this.harvest(e,t)}update(e,t){this.hud.update(),this.player.update(t),this.player.moved&&(this.turn(),this.sound.play("move")),this.keyboard.update(),this.player.health.isDepleted()&&0===this.explosions&&(this.game.scene.pause(this),this.game.scene.start("lose",{score:this.player.food.level}),this.sound.play("lose"))}turn(){this.turns++,this.harvest(this.player.x,this.player.y);for(const e of this.getTriggeredEvents(this.turns)){const t=e.x,s=e.y;if("grow"===e.name)this.grow(t,s);else if("anger"===e.name)this.anger(t,s);else if("explosion"===e.name){this.player.health.increment(-1);for(const[e,n]of r(t*a,s*i))this.explode(e,n);const e=this.add.sprite((t+.5)*a,(s+.5)*i,"explosion");n(this.cameras.main,e),e.play("explosion"),e.on(Phaser.Animations.Events.ANIMATION_COMPLETE,(()=>this.explosionDone(e))),this.explosions++,this.sound.play("explosion")}}if(this.map.numAnger<5&&.3>Math.random()){const e=Math.round(Math.random()*this.map.getWidth()),t=Math.round(Math.random()*this.map.getHeight());4===this.map.getTileAt(e,t)&&this.anger(e,t)}}harvest(e,t){const s=this.map.getTileAt(e,t);if((1===s||5===s||4===s)&&(this.map.putTileAt(3,e,t),4===s&&this.player.food.increment(1),"grow"!==this.getEventName)){const s=Math.round(10+10*Math.random());this.addEvent("grow",e,t,s)}}grow(e,t){3===this.map.getTileAt(e,t)?(this.map.putTileAt(4,e,t),this.hasEvent(e,t)&&console.warn("event still exists"),this.removeEvent(e,t)):console.warn("attempt to grow a non plant")}anger(e,t){4===this.map.getTileAt(e,t)?(this.map.putTileAt(5,e,t),this.addEvent("explosion",e,t,15)):console.warn("attempt to anger a non carrot")}explode(e,t){const s=this.map.getTileAt(e,t);3!==s&&4!==s&&5!==s||(this.map.putTileAt(1,e,t),this.hasEvent(e,t)&&console.warn("event still exists"),this.removeEvent(e,t))}addEvent(e,t,s,a){this.events.set(t+","+s,{name:e,time:this.turns+a,x:t,y:s})}removeEvent(e,t){this.events.delete(e+","+t)}hasEvent(e,t){return this.events.has(e+","+t)}getEventName(e,t){return this.events.has(e+","+t)?this.events.get(e+","+t).name:null}getTriggeredEvents(){const e=[],t=[];for(const[s,a]of this.events.entries())this.turns>=a.time&&(e.push(s),t.push(a));for(const t of e)this.events.delete(t);return t}explosionDone(e){e.destroy(),this.explosions--}}class y{constructor(e,t){this.scene=e,this.map=e.make.tilemap({key:"map"});const s=this.map.addTilesetImage("tileset");this.layer=this.map.createLayer("ground",s,0,0),n(t,this.layer),this.numAnger=0,this.steam=new Map}getTileAt(e,t){const s=this.layer.getTileAt(e,t);return null===s?-1:s.index}putTileAt(e,t,s){if(5===this.getTileAt(t,s)&&this.numAnger--,5===e){this.numAnger++;const e=this.scene.add.sprite((t+.5)*a,s*i,"steam");e.play("steam"),n(this.scene.cameras.main,e),this.steam.set(`${t},${s}`,e),this.scene.sound.play("angry")}else this.steam.has(`${t},${s}`)&&this.steam.get(`${t},${s}`).destroy();this.layer.putTileAt(e,t,s)}getWidth(){return this.map.width}getHeight(){return this.map.height}}class f{constructor(e,t){this.keys={},this.wasPressed={};for(const s of t)this.keys[s]=e.input.keyboard.addKey(s),this.wasPressed[s]=!1}isPressed(e){return this.keys[e].isDown}isJustPressed(e){return this.isPressed(e)&&!this.wasPressed[e]}update(){for(const e in this.keys)this.wasPressed[e]=this.isPressed(e)}}class v{constructor(e,t){this.level=e,this.max=t}increment(e){this.level+=e,this.level<0?this.level=0:this.level>this.max&&(this.level=this.max)}isDepleted(){return this.level<=1e-5}}class x{constructor(e){const{scene:t,camera:s,keyboard:r,map:h,x:o,y:l}=e;this.map=h,this.x=o,this.y=l,this.sprite=t.add.image(o*a,l*i,"selection"),this.sprite.setOrigin(0),n(s,this.sprite),this.keyboard=r,this.health=new v(5,5),this.food=new v(0,1e3),this.moved=!0}update(e){if(this.moved=!1,this.health.isDepleted())return;let t=0,s=0;if(this.keyboard.isJustPressed(m)?t=-1:this.keyboard.isJustPressed(p)?t=1:this.keyboard.isJustPressed(d)?s=-1:this.keyboard.isJustPressed(c)&&(s=1),0!==t||0!==s){const e=this.x+t,r=this.y+s;n=this.map.getTileAt(e,r),u.includes(n)||(this.x=e,this.y=r,this.sprite.x=e*a,this.sprite.y=r*i,this.moved=!0)}var n}}let w=!1,k=null;window.addEventListener("error",(e=>{if(w)return void console.warn("multiple errors");w=!0;const t=document.getElementById("error div"),s=document.getElementById("error text"),a=document.getElementById("display"),i=document.getElementById("loadingLogo");s&&e.error&&(s.innerHTML=e.error.stack),t&&(t.style.display="block"),null!==i&&(i.style.display="none"),null!==a&&(a.style.display="none"),null!==k&&(k.sound.stopAll(),k.destroy(),k.canvas.style.display="none")}));class b extends Phaser.Scene{preload(){this.load.image("player","assets/image/player.png"),this.load.image("tileset","assets/image/tileset.png"),this.load.image("carrot","assets/image/carrot.png"),this.load.image("selection","assets/image/selection.png"),this.load.image("hudBackground","assets/image/hudBackground.png"),this.load.image("button","assets/image/button.png"),this.load.image("background","assets/image/background.png"),this.load.spritesheet("heart","assets/image/heart.png",{frameWidth:18,frameHeight:18}),this.load.spritesheet("steam","assets/image/steam.png",{frameWidth:16,frameHeight:16}),this.load.spritesheet("explosion","assets/image/explosion.png",{frameWidth:48,frameHeight:48}),this.load.tilemapTiledJSON("map","assets/map.json"),this.load.bitmapFont("font","assets/image/font.png","assets/font.xml"),this.load.audio("explosion","assets/audio/explosion.wav"),this.load.audio("angry","assets/audio/angry.wav"),this.load.audio("move","assets/audio/move.wav"),this.load.audio("lose","assets/audio/lose.wav")}create(){this.anims.create({key:"full",frames:this.anims.generateFrameNumbers("heart",{frames:[0]})}),this.anims.create({key:"empty",frames:this.anims.generateFrameNumbers("heart",{frames:[1]})}),this.anims.create({key:"steam",frames:this.anims.generateFrameNumbers("steam",{start:0,end:5}),frameRate:12,repeat:-1}),this.anims.create({key:"explosion",frames:this.anims.generateFrameNames("explosion",{start:0,end:2}),frameRate:4,repeat:0})}update(){this.scene.start("mainMenu")}}document.addEventListener("DOMContentLoaded",(function(){const s=document.getElementById("loadingLogo");return null!==s&&s.parentElement.removeChild(s),k=new Phaser.Game({width:640,height:512,parent:"gameContainer",scene:new b,physics:{default:"arcade",arcade:{}},pixelArt:!0}),k.scene.add("play",new g),k.scene.add("mainMenu",new e),k.scene.add("lose",new t),k}))})();