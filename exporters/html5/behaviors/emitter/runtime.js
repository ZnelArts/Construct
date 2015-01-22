﻿/*
*  _____       _ _   _           
* |   __|_____|_| |_| |_ ___ ___ 
* |   __|     | |  _|  _| -_|  _|
* |_____|_|_|_|_|_| |_| |___|_|   by Hazneliel
*
* I did some search for someway to multiple objets as sprites, first
* I looked at the Particles object but that one only spawns images.
* After not finding anything I decided to write this emitter that would enable
* me to spawn any object.
*
* If you think you can help me pls do it and send me an email or post on the forum thread in Scirra´s site
* Extended by: Jorge Popoca, hazneliel@gmail.com
* version 1.1
* 01.01.2015
*
* Changes in version 1.1
* -Added repeat count functionality
* TODO
* - Have separate range for X and for Y
* - Have a center offset (maybe you want to spawn in a donut shape)
*
* credits to https://www.scirra.com/users/somebody for the icon image
*
*/

"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.behaviors, "cr.behaviors not created");

/////////////////////////////////////
// Behavior class
cr.behaviors.Emitter = function(runtime) {
	this.runtime = runtime;
};

(function () {
	var behaviorProto = cr.behaviors.Emitter.prototype;
		
	/////////////////////////////////////
	// Behavior type class
	behaviorProto.Type = function(behavior, objtype) {
		this.behavior = behavior;
		this.objtype = objtype;
		this.runtime = behavior.runtime;
	};
	
	var behtypeProto = behaviorProto.Type.prototype;

	behtypeProto.onCreate = function() {
	};

	/////////////////////////////////////
	// Behavior instance class
	behaviorProto.Instance = function(type, inst) {
		this.type = type;
		this.behavior = type.behavior;
		this.inst = inst;				// associated object instance to modify
		this.runtime = type.runtime;
	};
	
	var behinstProto = behaviorProto.Instance.prototype;

	behinstProto.onCreate = function() {
		// Load properties
		this.rateOfSpawn = this.properties[0];
		this.range = this.properties[1];
		this.enabled = (this.properties[2] !== 0);
		this.repeatCount = this.properties[3];
		this.spawnTimeCount = this.rateOfSpawn;		// counts up to rate of spawn before spawning. starts in fully reloaded state
		this.firstTickWithTarget = true;
		this.spawnCount = 0; // Count the number of times the spawn has been triggered
		
		var self = this;
		
		// Need to know if target object gets destroyed
		if (!this.recycled) {
			this.myDestroyCallback = function(inst) {
				self.onInstanceDestroyed(inst);
			};
		}
										
		this.runtime.addDestroyCallback(this.myDestroyCallback);
	};
	
	behinstProto.saveToJSON = function () {
		var o = {
			"ros": this.rateOfSpawn,
			"rng": this.range,
			"obj": this.spawnObject,
			"en": this.enabled,
			"lct": this.lastCheckTime,
			"stc": this.spawnTimeCount,
			"rc": this.repeatCount
		};

		return o;
	};
	
	behinstProto.loadFromJSON = function (o) {
		this.range = o["rng"];
		this.rateOfSpawn = o["ros"];
		this.spawnObject  = o["obj"];
		this.enabled = o["en"];
		this.lastCheckTime = o["lct"];
		this.spawnTimeCount = o["stc"] || 0;
		this.repeatCount = o["rc"];
	};
	
	behinstProto.afterLoad = function () {
		console.log("afterLoad");
	};
	
	behinstProto.onInstanceDestroyed = function (inst) {

	};
	
	behinstProto.onDestroy = function () {
		this.runtime.removeDestroyCallback(this.myDestroyCallback);
	};
	
	behinstProto.tick = function () {
		
		var dt = this.runtime.getDt(this.inst);
		var nowtime = this.runtime.kahanTime.sum;
		var inst = this.inst;
		
		if (!this.enabled) {
			return;
		}
		
		// Increment spawn time counter
		this.spawnTimeCount += dt;
		// Shoot at the rate of spawn if within 1 degree of target
		if (this.spawnTimeCount >= this.rateOfSpawn) {
				this.spawnTimeCount -= this.rateOfSpawn;
				
				// If the rate of spawn was changed, we might still be over the counter.
				// Just reset to zero in this case.
				if (this.spawnTimeCount >= this.spawnOfSpawn) {
					this.spawnTimeCount = 0;
				}
				
				if (!this.spawnObject) {
					return;
				}
				
				// Spawn object at random position in the range around the center 
				var inst = this.runtime.createInstance(
					this.spawnObject, 
					this.inst.layer, this.inst.x + Math.floor((Math.random() * this.range) + 1) * (Math.random() < 0.5 ? -1 : 1),
					this.inst.y + Math.floor((Math.random() * this.range) + 1) * (Math.random() < 0.5 ? -1 : 1)
				);
				if (!inst) {
					return;
				}
				this.runtime.trigger(cr.behaviors.Emitter.prototype.cnds.OnSpawn, this.inst);
				this.runtime.trigger(Object.getPrototypeOf(this.spawnObject.plugin).cnds.OnCreated, inst);
				this.spawnCount++;

				if (this.spawnCount == this.repeatCount) {
					this.enabled = false;
					this.runtime.trigger(cr.behaviors.Emitter.prototype.cnds.OnFinished, this.inst);
				}
			}

			this.firstTickWithTarget = false;

		if (this.spawnTimeCount > this.rateOfSpawn) {
			this.spawnTimeCount = this.rateOfSpawn;
		}
	};
	
	/**BEGIN-PREVIEWONLY**/
	behinstProto.getDebuggerValues = function (propsections) {
		propsections.push({
			"title": this.type.name,
			"properties": [
				{"name": "Range", "value": this.range},
				{"name": "Rate of spawn", "value": this.rateOfSpawn},
				{"name": "Enabled", "value": this.enabled},
				{"name": "Duration", "value": this.duration}
			]
		});
	};
	
	behinstProto.onDebugValueEdited = function (header, name, value) {
		switch (name) {
		case "Range":					this.range = value;					break;
		case "Rate of spawn":			this.rateOfSpawn = value;			break;
		case "Enabled":					this.enabled = value;				break;
		case "Duration":				this.duration = value;				break;
		}
	};
	/**END-PREVIEWONLY**/

	//////////////////////////////////////
	// Conditions
	function Cnds() {};
	
	Cnds.prototype.OnSpawn = function () {
		return true;
	};
	
	Cnds.prototype.OnFinished = function () {
		return true;
	};
	
	behaviorProto.cnds = new Cnds();

	//////////////////////////////////////
	// Actions
	function Acts() {};
	
	Acts.prototype.SetEnabled = function (e) {
		this.enabled = (e !== 0);
	};
	
	Acts.prototype.SetRange = function (r) {
		this.range = r;
	};
	
	Acts.prototype.SetDuration = function (r) {
		this.duration = r;
	};
	
	Acts.prototype.SetRateOfSpawn = function (r) {
		this.rateOfspawn = r;
	};
	
	Acts.prototype.SetObject = function (obj_)
	{
		var targetTypes = this.type.targetTypes;
		
		this.spawnObject = obj_;
	};
	
	behaviorProto.acts = new Acts();

	//////////////////////////////////////
	// Expressions
	function Exps() {};
	
	Exps.prototype.Range = function (ret) {
		ret.set_float(this.range);
	};
	
	Exps.prototype.RateOfSpawn = function (ret) {
		ret.set_float(this.rateOfSpawn);
	};
	
	Exps.prototype.Duration = function (ret) {
		ret.set_float(this.duration);
	};
	
	behaviorProto.exps = new Exps();
	
}());