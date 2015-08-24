base.registerModule('minions', function(module) {
  var menu = base.importModule('menu');
  var engine = base.importModule('engine');
  var data = base.importModule('data');
  var main = base.importModule('main');
  
  function setVariable(key, value) {
    menu.MenuPlay.instance.variables[key] = value;
  }
  
  /**
   * represents a minion!
   */
  var Minion = base.extend(Object, 'Minion', {
    constructor: function Minion() {
      this.skillFarming = 1;
      this.skillMining = 1;
      this.skillCrafting = 1;
      this.skillFighting = 1;
      this.hp = data.MAX_HP;
      this.name = "John Smith";
      this.healing = false; //whether or not the minion is resting in the caves to heal
      this.equipment = "none";
      this.spells = [];
    },
    /**
     * synchronizes the minion data with the gui
     */
    syncSlot: function syncSlot(station, slot) {
      var prefix = station + slot;
      setVariable(prefix + ".name", this.name);
      setVariable(prefix + ".farmSkill", this.skillFarming);
      setVariable(prefix + ".mineSkill", this.skillMining);
      setVariable(prefix + ".craftSkill", this.skillCrafting);
      setVariable(prefix + ".fightSkill", this.skillFighting);
      setVariable(prefix + ".hp", this.hp);
      setVariable(prefix + ".equipment", this.equipment);
    },
    /**
     * returns the skill at a particular station
     */
    getSkillAtStation: function getSkillAtStation(station) {
      var name = station.name;
      if(name == "fields") {
        return this.skillFarming;
      } else if(name == "mountains") {
        return this.skillMining;
      } else if(name == "workshop") {
        return this.skillCrafting;
      }
      return 0;
    },
    levelup: function levelup(station, slot) {
      if(station.name == "fields") {
        this.skillFarming++;
      } else if(station.name == "mountains") {
        this.skillMining++;
      } else if(station.name == "workshop") {
        this.skillCrafting++;
      } else if(station.name == "caves" && !this.healing) {
        this.skillFighting++;
      }
      if(this.hp < data.MAX_HP) {
        this.hp++;
        if(this.hp == data.MAX_HP) {
          this.healing = false;
        }
      }
      this.syncSlot(station.name, slot);
    },
    feed: function feed(station, slot) {
      var fields = Game.instance.stationFields;
      if(fields.supplies.food === 0) {
        station.removeMinion(this); //die
      } else {
        fields.supplies.food--;
      }
    },
    getPower: function getPower() {
      return this.skillFighting + this.getEquipmentBonus();
    },
    getToughness: function getPower() {
      return this.hp + this.getEquipmentBonus();
    },
    getEquipmentBonus: function getEquipmentBonus() {
      if(this.equipment == 'tin') {
        return 1;
      } else if(this.equipment == 'copper') {
        return 2;
      } else if (this.equipment == 'iron') {
        return 3;
      }
      return 0;
    },
    damage: function damaage(station, slot, amount) {
      this.hp -= amount;
      if(this.hp <= 0) {
        station.removeMinion(this);
      } else {
        if(this.hp < data.MIN_CAVE_HP) {
          this.healing = true;
        }
        this.syncSlot(station.name, slot);
      }
    }
  });
  
  /**
   * a station
   */
  var Station = base.extend(Object, 'Station', {
    constructor: function Station(name) {
      this.name = name;
      this.maxMinions = 4;
      this.minions = []; //people there
      this.production = 0; //how much it can produce
      if(this.name == "fields") {
        this.supplies = {mana: 20, food: 20};
        this.producing = {mana: 0, food: 0};
      } else if(this.name == "mountains") {
        this.supplies = {tin: 0, copper: 0, iron: 0};
        this.producing = {tin: 0, copper: 0, iron: 0};
      } else if(this.name == "workshop") {
        this.supplies = {tinA: 0, copperA: 0, ironA: 0};
        this.producing = {tinA: 0, copperA: 0, ironA: 0};
      } else {
        this.supplies = {};
        this.producing = {};
      }
      this.removals = [];
      this.syncGui();
      for(var i=0; i<this.maxMinions; i++) {
        this.clearSlot(i);
      }
    },
    addMinion : function addMinion(minion) {
      if(this.minions.length < this.maxMinions) {
        this.minions.push(minion);
        minion.syncSlot(this.name, this.minions.length-1);
        this.calculateProduction();
        this.syncGui();
        return true;
      }
      return false;
    },
    removeMinion: function removeMinion(minion) {
      this.removals.push(minion);
    },
    flushRemovals: function flushRemovals() {
      var i;
      if(this.removals.length === 0) {
        return;
      }
      var selected = Game.instance.selectedSlot;
      for(i=0; i<this.removals.length; i++) {
        var minion = this.removals[i];
        var index = this.minions.indexOf(minion);
        if(index != -1) {
          if(selected !== null && this == selected.station) {
            if(index == selected.slot) {
              selected = null;
              Game.instance.setSelectedSlot(selected);
            } else if(index < selected.slot) {
              selected = {station: selected.station, slot: selected.slot-1};
              Game.instance.setSelectedSlot(selected);
            }
          }
          this.minions.splice(index, 1);
        }
      }
      for(i=0; i<this.minions.length; i++) {
        this.minions[i].syncSlot(this.name, i);
      }
      for(i=this.minions.length; i<this.maxMinions; i++) {
        this.clearSlot(i);
      }
      this.calculateProduction();
      this.reduceProducing();
      this.syncGui();
      this.removals = [];
    },
    reduceProducing: function reduceProducing() {
      while(this.production < this.getTotalProducing()) {
        if(this.name == 'fields') {
          if(this.producing.mana > 0) {
            this.producing.mana--;
          } else if(this.producing.food > 0) {
            this.producing.food--;
          } else {
            break;
          }
        } else if(this.name == 'mountains') {
          if(this.producing.tin > 0) {
            this.producing.tin--;
          } else if(this.producing.copper > 0) {
            this.producing.copper--;
          } else if(this.producing.iron > 0) {
            this.producing.iron--;
          } else {
            break;
          }
        } else if(this.name == 'workshop') {
          if(this.producing.tinA > 0) {
            this.producing.tinA--;
          } else if(this.producing.copperA > 0) {
            this.producing.copperA--;
          } else if(this.producing.ironA > 0) {
            this.producing.ironA--;
          } else {
            break;
          }
        } else {
          break;
        }
      }
    },
    /**
     * set the slot to blank data
     */
    clearSlot: function clearSlot(slot) {
      var prefix = this.name + slot;
      setVariable(prefix + '.name', 'null');
      setVariable(prefix + '.farmSkill', 0);
      setVariable(prefix + '.mineSkill', 0);
      setVariable(prefix + '.craftSkill', 0);
      setVariable(prefix + '.fightSkill', 0);
      setVariable(prefix + '.hp', 0);
      setVariable(prefix + '.equipment', 'none');
    },
    gatherSupplies: function gatherSupplies() {
      if(this.name == "fields") {
        this.supplies.mana += this.producing.mana;
        this.supplies.food += this.producing.food;
      } else if(this.name == "mountains") {
        this.supplies.tin += this.producing.tin;
        this.supplies.copper += this.producing.copper;
        this.supplies.iron += this.producing.iron;
      } else if(this.name == "workshop") {
        var mountains = Game.instance.stationMountains;
        var change;
        if(mountains.supplies.tin > 0) {
          change = Math.min(this.producing.tinA, mountains.supplies.tin);
          mountains.supplies.tin -= change;
          this.supplies.tinA += change;
        }
        if(mountains.supplies.copper > 0) {
          change = Math.min(this.producing.copperA, mountains.supplies.copper);
          mountains.supplies.copper -= change;
          this.supplies.copperA += change;
        }
        if(mountains.supplies.iron > 0) {
          change = Math.min(this.producing.ironA, mountains.supplies.iron);
          mountains.supplies.iron -= change;
          this.supplies.ironA += change;
        }
        mountains.syncGui();
      } else if(this.name == "caves") {
        for(var i=0; i<this.minions.length; i++) {
          var minion = this.minions[i];
          var rand = Math.random() - minion.getEquipmentBonus();
          if(!minion.healing && rand < data.CAVE_HURT) {
            minion.damage(this, i, 1);
          }
        }
        this.flushRemovals();
      }
      this.syncGui();
    },
    levelupMinions: function levelupMinions() {
      for(var i=0; i<this.minions.length; i++) {
        this.minions[i].levelup(this, i);
      }
      this.calculateProduction();
      this.syncGui();
    },
    feedMinions: function feedMinions() {
      for(var i=0; i<this.minions.length; i++) {
        this.minions[i].feed(this, i);
      }
      this.flushRemovals();
    },
    calculateProduction: function calculateProduction() {
      this.production = 0;
      for(var i=0; i<this.minions.length; i++) {
        this.production += this.minions[i].getSkillAtStation(this);
      }
    },
    /**
     * syncs the station data with the gui
     */
    syncGui: function syncGui() {
      if(this.name == "fields") {
        setVariable('manaText', this.supplies.mana);
        setVariable('foodText', this.supplies.food);
        setVariable('plantText', this.producing.mana + '/' + this.producing.food);
      } else if(this.name == "mountains") {
        setVariable('tinText', this.supplies.tin);
        setVariable('copperText', this.supplies.copper);
        setVariable('ironText', this.supplies.iron);
        setVariable('oreText', this.producing.tin + '/' + this.producing.copper +
            '/' + this.producing.iron);
      } else if(this.name == "workshop") {
        setVariable('tinAText', this.supplies.tinA);
        setVariable('copperAText', this.supplies.copperA);
        setVariable('ironAText', this.supplies.ironA);
        setVariable('armorText', this.producing.tinA + '/' + this.producing.copperA + 
            '/' + this.producing.ironA);
      }
      setVariable(this.name + ".PP", this.getTotalProducing() + '/' + this.production);
      if(Game.instance !== null) {
        Game.instance.syncGui();
      }
    },
    produceMore: function produceMore(supply) {
      this.producing[supply]++;
      if(this.getTotalProducing() > this.production) {
        this.producing[supply]--;
      } else {
        this.syncGui();
      }
    },
    produceLess: function produceLess(supply) {
      if(this.producing[supply] > 0) {
        this.producing[supply]--;
        this.syncGui();
      }
    },
    /**
     * returns the production points in use
     */
    getTotalProducing: function getTotalProducing() {
      if(this.name == "fields") {
        return this.producing.mana * data.PP_MANA +
                this.producing.food * data.PP_FOOD;
      } else if(this.name == "mountains") {
        return this.producing.tin * data.PP_TIN + 
                this.producing.copper * data.PP_COPPER + 
                this.producing.iron * data.PP_IRON;
      } else if(this.name == "workshop") {
        return this.producing.tinA * data.PP_TIN +
                this.producing.copperA * data.PP_COPPER +
                this.producing.ironA * data.PP_IRON;
      }
      return 0;
    }
  });
  
  /**
   * everything in the game
   */
  var Game = base.extend(engine.Sprite, 'Game', {
    constructor: function Game() {
      this.stationFields = new Station("fields");
      this.stationMountains = new Station("mountains");
      this.stationWorkshop = new Station("workshop");
      this.stationCaves = new Station("caves");
      this.stations = [this.stationFields, this.stationMountains, 
          this.stationWorkshop, this.stationCaves];
      this.tickCount = 0;
      this.selectedSlot = null;
      this.heroPower = 7;
      this.heroHp = 15;
      this.syncGui();
    },
    update: engine.listener(engine.EventTick.ID, function update(event) {
      this.tickCount++;
      if(this.tickCount % 300 === 0) {
        this.gatherSupplies();
      }
      if(this.tickCount % 1200 === 0) {
        this.feedMinions();
        this.levelupMinions(); //skill increases
      }
    }),
    /**
     * farming produces mana, mountains produce ores, etc. etc
     */
    gatherSupplies: function gatherSupplies() {
      for(var i=0; i<this.stations.length; i++) {
        this.stations[i].gatherSupplies();
      }
    },
    /**
     * increase minion's skills in whatever they're currently doing
     */
    levelupMinions: function levelupMinions() {
      for(var i=0; i<this.stations.length; i++) {
        this.stations[i].levelupMinions();
      }
      this.heroPower += Math.floor(this.tickCount/24000) + 5;
      this.heroHp += Math.floor(this.tickCount/24000) + 5;
      this.syncGui();
    },
    /**
     * eat of die!
     */
    feedMinions: function feedMinions() {
      for(var i=0; i<this.stations.length; i++) {
        this.stations[i].feedMinions();
      }
    },
    setSelectedSlot: function syncGui(selected) {
      var ss = this.selectedSlot;
      this.selectedSlot = selected;
      if(ss !== null) {
        setVariable(ss.station.name + ss.slot + ".selected", undefined);
      }
      if(selected !== null) {
        setVariable(selected.station.name + selected.slot + ".selected", true);
      }
    },
    getSelectedMinion: function getSelectedMinion() {
      if(this.selectedSlot === null) {
        return null;
      }
      return this.selectedSlot.station.minions[this.selectedSlot.slot];
    },
    syncGui: function syncGui() {
      var playerPower = 0;
      var playerToughness = 25;
      for(var i=0; i<this.stations.length; i++) {
        var station = this.stations[i];
        for(var k=0; k<station.minions.length; k++) {
          var minion = station.minions[k];
          playerPower += minion.getPower();
          playerToughness += minion.getToughness();
        }
      }
      setVariable('playerText', playerPower + "/" + playerToughness);
      setVariable('heroText', this.heroPower + "/" + this.heroHp);
      setVariable('difference', (this.heroPower - playerPower) + "/" +
        (this.heroHp - playerToughness));
        
      //check end conditions
      if(playerPower > this.heroPower && playerToughness > this.heroHp) {
        main.menuManager.setMenu(new menu.MenuPlay('gui/win'));
      } else if(this.heroPower > playerPower && this.heroHp > playerToughness) {
        main.menuManager.setMenu(new menu.MenuPlay('gui/lose'));
      }
    }
  });
  module.Game = Game;
  Game.prototype.compile();
  Game.instance = null;
  
  /**
   * summons a minion
   */
  function summon() {
    var minion = new Minion();
    var stations = Game.instance.stations;
    var stationFields = Game.instance.stationFields;
    if(stationFields.supplies.mana < data.COST_SUMMON) {
      return;
    }
    
    for(var i=0; i<stations.length; i++) {
      var station = stations[i];
      if(station.addMinion(minion)) {
        stationFields.supplies.mana -= data.COST_SUMMON;
        stationFields.syncGui();
        return;
      }
    }
  }
  
  /**
   * increases production in a particular product
   */
  function increaseProduction(station, supply) {
    return function() {
      station.produceMore(supply);
    };
  }
  
  function decreaseProduction(station, supply) {
    return function() {
      station.produceLess(supply);
    };
  }
  
  /**
   * select a minion on the gui
   */
  function selectMinion(station, slot) {
    return function() {
      if(station.minions.length > slot) {
        var selected = {station: station, slot: slot};
        Game.instance.setSelectedSlot(selected);
      }
    };
  }
  
  /**
   * moves the selected minion to a station
   */
  function moveMinion(station) {
    return function() {
      var minion = Game.instance.getSelectedMinion();
      if(minion !== null) {
        Game.instance.selectedSlot.station.removeMinion(minion);
        Game.instance.selectedSlot.station.flushRemovals();
        station.addMinion(minion);
      }
    };
  }
  
  /**
   * equips armor to selected minion
   */
  function equipMinion(armor) {
    return function() {
      var minion = Game.instance.getSelectedMinion();
      if(minion !== null) {
        var supplies = Game.instance.stationWorkshop.supplies;
        if(supplies[armor + 'A'] > 0){
          supplies[armor + 'A']--;
          minion.equipment = armor;
          var ss = Game.instance.selectedSlot;
          minion.syncSlot(ss.station.name, ss.slot);
          Game.instance.syncGui();
        }
      }
    };
  }
  
  function displayInstructions() {
    Game.instance.parentGroup.removeSprite(Game.instance);
    main.menuManager.setMenu(new menu.MenuPlay('gui/instructions'));
  }
   
  module.init = function init() {
    Game.instance = new Game();
    setVariable('summon', summon);
    var game = Game.instance;
    
    var stations = [['Fields', 'mana', 'food'], ['Mountains', 'tin', 'copper', 'iron'],
      ['Workshop', 'tinA', 'copperA', 'ironA']];
    var station;
    var i;
    var k;
    
    //production choices
    for(i=0; i<stations.length; i++) {
      station = game['station' + stations[i][0]];
      for(k=1; k<stations[i].length; k++) {
        var supply = stations[i][k];
        setVariable(supply + 'Up', increaseProduction(station, supply));
        setVariable(supply + 'Down', decreaseProduction(station, supply));
      }
    }
    
    //minion selection
    for(i=0; i<game.stations.length; i++) {
      station = game.stations[i];
      for(k=0; k<station.maxMinions; k++) {
        setVariable(station.name + k + ".box", selectMinion(station, k));
      }
    }
    
    //minion moving
    for(i=0; i<game.stations.length; i++) {
      station = game.stations[i];
      setVariable(station.name + "Move", moveMinion(station));
    }
    
    var armors = ['tin', 'copper', 'iron'];
    for(i=0; i<armors.length; i++) {
      var armor = armors[i];
      setVariable(armor + "Equip", equipMinion(armor));
    }
    
    setVariable('instructions', displayInstructions);
  };
});