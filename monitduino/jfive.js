var Storage = new require("./storage"),
    storage = new Storage();
var _ = require("lodash");
/*
var redis = new require("redis"),
    client = redis.createClient();
*/
var socketIO;
var five = require("johnny-five"),
com = require("serialport");
var serialPort = new com.SerialPort("/dev/ttyUSB1", {
	baudrate: 9600,
	parser: com.parsers.readline('\r\n')
});


var time = 0;
var l_a = 0;
var l_b = 0;
var h = 0;
var cel = 0;
var hum = 0;
var counterLiquidsA = 0;
var counterLiquidsB = 0;
var counterLiquidsC = 0;
var counterTemperature = 0;
var counterHumidity = 0;
var counterSmog = 0;
var counterDoor = 0;
var counterLuz = 0;
var counterLuz2 = 0;
var datoT = [];
var datoH = [];
var regexp = /(^([\d.,])*)$/;

var Monitduino = function(){
    var that = this;
    this.socketIO = null;
    this.nNotifications = null;
    this.liq_a = null;
    this.liq_b = null;
    this.liq_c = null;
    this.hum_a = null;
    this.t_track = null;
    this.board = null;
    this.count = 0;
    this.humos = 0;
    this.alarma = null;
    this.luz1 = null;
    this.luz2 = null;
    this.aire1 = null;
    this.aire2 = null;
    this.aires1 = 0;
    this.aires2 = 0;
    this.luces1 = 0;
    this.luces2 = 0;
    this.airesC = 0;
    this.airesC2 = 0;
    /*
    client.get("numberOfAlerts", function(err, reply) {
	if (err) { console.log(err); }
	if (reply !== undefined && reply !== null) {
	    that.nNotifications = reply;
	} else {
	    that.nNotifications = 0;
	}
    });
	*/
};

Monitduino.globals = {alarms:{
    state: false, 
    humo: false, 
    liquidos: false, 
    liquidoA: false,
    liquidoB: false,
    liquidoC: false,
    temperatura: false, 
    huemdad: false
}};

Monitduino.prototype.buildChartOf = function(dataName, DOMContainer) {
      Highcharts.setOptions({
            global: {
                useUTC: false
            }
        });
};

Monitduino.prototype.setAlertState = function(state, name) {
    console.log("State : " + state + " and Name is : " + name);
    if (state) {
	switch(name) {
	case Storage.schemas.Temperatura.schema.name:
	    Monitduino.globals.alarms.temperatura = true;
	    break;
	case  Storage.schemas.Humedad.schema.name:
	    Monitduino.globals.alarms.humedad = true;
	    break;
	case  Storage.schemas.Humo.schema.name:
	    Monitduino.globals.alarms.humo = true;
	    break;
	case  Storage.schemas.LiquidoA.schema.name:
	    Monitduino.globals.alarms.liquidoA = true;
	    Monitduino.globals.alarms.liquidos = true;
	    break;
	case  Storage.schemas.LiquidoB.schema.name:
	    Monitduino.globals.alarms.liquidoB = true;
	    Monitduino.globals.alarms.liquidos = true;
	    break;
	case  Storage.schemas.LiquidoC.schema.name:
	    Monitduino.globals.alarms.liquidoC = true;
	    Monitduino.globals.alarms.liquidos = true;
	    break;
	}
    } else {
	console.log("Monitduino");
	Monitduino.globals.alarms = {
	    state: state, 
	    humo: false, 
	    liquidos: false,
	    liquidoA: false,
	    liquidoB: false,
	    liquidoC: false,
	    temperatura: false, 
	    humedad: false
	};
    }
    Monitduino.globals.alarms.state = state;
};

Monitduino.prototype.sendSocketAndMaybeStoreRegistry = function(name, value, counter, store) {
	var valor = value;
	var registry = {name: name, value: value};
	if (storage !== undefined && storage !== null) {
		storage.createRegistry(registry.name, registry.value);	
	} else { console.log("storage not defined"); }
	this.count = 0;
	if (this.socketIO !== undefined && this.socketIO !== null) {
		switch(registry.name){
			case "Temperatura":
			case "temperatura":
			datoT.push([registry.value]);
			if (registry.value >= Storage.schemas.Temperatura.schema.max) {
			    this.activatedesalarm(true, Storage.schemas.Temperatura.schema.name);
			    this.socketIO.sockets.emit('alert', {name: "temperatura", value: registry.value});
			}
			this.socketIO.sockets.emit('promt', datoT);
			break;
			case "Humedad":
			case "humedad":
			datoH.push([registry.value]);
			if (registry.value >= Storage.schemas.Humedad.schema.max) {
			    this.activatedesalarm(true, Storage.schemas.Humedad.schema.name);
			    this.socketIO.sockets.emit('alert', {name: "humedad", value: registry.value});
			}
			this.socketIO.sockets.emit('humt', datoH);
			break;
			case "liquidoA":
			case "LiquidoA":
			if (registry.value) {
			    this.activatedesalarm(true, Storage.schemas.LiquidoA.schema.name);
			    this.socketIO.sockets.emit('alert', {name: "liquidoA", value: registry.value});
			}
			break;
			case "liquidoB":
			case "LiquidoB":
			if (registry.value) {
			    this.activatedesalarm(true, Storage.schemas.LiquidoB.schema.name);
				this.socketIO.sockets.emit('alert', {name: "liquidoB", value: registry.value});
			}
			break;
			case "liquidoC":
			case "LiquidoC":
			if (registry.value >= Storage.schemas.LiquidoC.schema.max) {
			    this.activatedesalarm(true, Storage.schemas.LiquidoC.schema.name);
			    this.socketIO.sockets.emit('alert', {name: "liquidoC", value: registry.value});
			}
			break;
			case "humo":
			case "humo":
			if (registry.value) {
			    this.activatedesalarm(true, Storage.schemas.Humo.schema.name);
			    this.socketIO.sockets.emit('alert', {name: "humo", value: registry.value});
			}
			break;
			case "principal":
			if (registry.value){
				this.socketIO.sockets.emit('estP', registry.value);
				//console.log("enviando puerta");
				//console.log(registry.value);
			}
			break;
			case "usuario":
			if (registry.value){
				this.socketIO.sockets.emit('usuario', registry.value);
				//console.log("enviando usuario");
			}
			break;
			case "luz_1":
			if (registry.value){
				this.socketIO.sockets.emit('estL', registry.value);
				console.log(registry.value);
			}
			break;
			case "luz_2":
			if (registry.value){
				this.socketIO.sockets.emit('estL2', registry.value);
			}
			break;
			case "aire_1":
			if (registry.value){
				this.socketIO.sockets.emit('estA', registry.value);
				console.log(registry.value);
			}
			break;			
		};   

		this.socketIO.sockets.emit('general', registry); 
	} 
	else { console.log("SOCKET IO not found"); }
	return registry;
};

Monitduino.prototype.initStorage = function() {
	storage.init();
};

Monitduino.prototype.setSocket = function(io) {
     this.socketIO = io;
     this.setupSocketEvents();
 };

Monitduino.prototype.setupSocketEvents = function(){
	var that = this;

    this.socketIO.on('humo', function(data) {
	that.humos = data;
	that.activatedesalarm(data);
    });

    this.socketIO.on('luz1', function(data){
	that.luces1 = data;
	that.activarluz1(data);
    });

    this.socketIO.on('luz2', function(data){
	that.luces2 = data;
	that.activarluz2(data);
    });

    this.socketIO.on('air1', function(data){
	that.aires1 = data;
	that.activaraire1(data);
    });

    this.socketIO.on('air2', function(data){
	that.aires2 = data;
	that.activaraire2(data);
    });

    this.socketIO.on('a1control', function(data){
	that.airesC = data;
	that.controlaire1(data);
    });

    this.socketIO.on('a2control', function(data){
	that.airesC2 = data;
	that.controlaire2(data);
    });

    this.socketIO.on('schemaData', function(data) {
    	_.forEach(Storage.schemas, function(schema) {
    		console.log(data.name);
    		console.log(schema.schema.name);
	    	if (schema.schema.name === data.name) {
	    		console.log(schema.schema);
	    		schema.schema.max = data.max;
	    		schema.schema.min = data.min;
	    	}
	    });
    });
};

Monitduino.prototype.activarluz1 = function(activate){
	var result = false;
	if(this.luz1 !== null && this.luz1 !== undefined){
		activate ? this.luz1.on() : this.luz1.off();
		result = true;
	}
	return result;
};

Monitduino.prototype.activarluz2 = function(activate){
	var result = false;
	if(this.luz2 !== null && this.luz2 !== undefined){
		activate ? this.luz2.on() : this.luz2.off();
		result = true;
	}
	return result;
};

Monitduino.prototype.activaraire1 = function(activate){
	var result = false;
	if(this.aire1 !== null && this.aire1 !== undefined){
		activate ? this.aire1.on() : this.aire1.off();
		result = true;
	}
	return result;
};

Monitduino.prototype.activaraire2 = function(activate){
	var result = false;
	if(this.aire2 !== null && this.aire2 !== undefined){
		activate ? this.aire2.on() : this.aire2.off();
		result = true;
	}
	return result;
};

Monitduino.prototype.controlaire1 = function(control){
	var result = false;
	if(this.aire1 !== null && this.aire1 !== undefined){
		if (control === 1){
			this.aire1.brightness(64);
		}
		if (control === 2){
			this.aire1.brightness(128);
		}
		if (control === 3){
			this.aire1.brightness(190);
		}
		if (control === 4){
			this.aire1.brightness(255);
		}
	}
	return result;
};

Monitduino.prototype.controlaire2 = function(control){
	var result = false;
	if(this.aire2 !== null && this.aire2 !== undefined){
		if (control ===  1){
			this.aire2.brightness(64);
		}
		if (control === 2){
			this.aire2.brightness(128);
		}
		if (control === 3){
			this.aire2.brightness(190);
		}
		if (control === 4){
			this.aire2.brightness(255);
		}
	}
	return result;
};

Monitduino.prototype.activatedesalarm = function(activate, name){
	var result = false;
	if(this.alarma !== null && this.alarma !== undefined) {
	    if(activate || activate === undefined) {
		this.setAlertState(true, name);
		this.socketIO.sockets.emit("onAlarmStatesChanged", Monitduino.globals.alarms);
		this.alarma.on();
	    } else {
		this.setAlertState(false);
		this.socketIO.sockets.emit("onAlarmStatesChanged", Monitduino.globals.alarms);
		this.alarma.off();
	    }
		result = true;
	}
	return result;
};

var negativeValue = "0", positiveValue = "1";

Monitduino.prototype.setupBoard = function ()  {

	var that = this;
	that.board = five.Board();
	if (that.board) {
		that.board.on("ready", function(){

			var lcdB = 0;

			that.liq_a = new five.Button({
				board: that.board,
				pin: 22,
				holdtime: 3000,
				invert: false
			});

			that.liq_b = new five.Button({
				board: that.board,
				pin: 23,
				holdtime: 3000,
				invert: false
			});

			that.liq_c = new five.Button({
				board: that.board,
				pin: 24,
				holdtime: 3000,
				invert: false
			});

			that.hum_a = new five.Button({
				board: that.board,
				pin: 25,
				holdtime: 3000,
				invert: false
			});

			that.t_rack = new five.Sensor({
				pin: "A0",
				freq: 30000
			});

			var lcdButton = new five.Button({
				board: that.board,
				pin: 10,
				holdtime: 1000	
			});

		    that.alarmaButton = new five.Button({
			board: that.board,
			pin: 26
		    });

		    that.luz_1 = new five.Button({
		    	board: that.board,
		    	pin: 40,
		    	holdtime: 500,
		    	invert: false
		    });
		    
		    that.luz_2 = new five.Button({
		    	board: that.board,
		    	pin: 41,
		    	holdtime: 500,
		    	invert: false
		    });

		    that.aire_1 = new five.Button({
		    	board: that.board,
		    	pin: 42,
		    	holdtime: 500,
		    	invert: false
		    });

			that.alarma = new five.Led(13);
			that.luz1 = new five.Led(30);
			that.luz2 = new five.Led(31);
			that.aire1 = new five.Led(9);
			that.aire2 = new five.Led(8);

			var lcd = new five.LCD({
				pins: [12, 11, 5, 4, 3, 2]
			});

	    //probe

	    if(that.humos){
	    	that.alarma.on();
	    }
	    else {
	    	that.alarma.off();
	    }

	    if(that.luces1){
	    	that.luz1.on();
	    }
	    else {
	    	that.luz1.off();
	    }

	    if(that.luces2){
	    	that.luz2.on();
	    }
	    else {
	    	that.luz2.off();
	    }

	    if(that.aires1){
	    	that.aire1.brightness(128);
	    }
	    else {
	    	that.aire1.off();
	    }

	    if(that.aires2){
	    	that.aire2.brightness(128);
	    }
	    else {
	    	that.aire2.off();
	    }

	    if(that.airesC === 1){
	    	that.aire1.brightness(64);
	    }
	    if (that.airesC === 2){
	    	that.aire1.brightness(128);
	    }
	    if (that.airesC === 3){
	    	that.aire1.brightness(200);
	    }
	    if (that.airesC === 4){
	    	that.aire1.brightness(255);
	    }

	    if(that.airesC2 === 1){
	    	that.aire2.brightness(64);
	    }

	    if (that.airesC2 === 2){
	    	that.aire2.brightness(128);
	    }

	    if (that.airesC2 == 3){
	    	that.aire2.brightness(200);
	    }

	    if (that.airesC2 === 4){
	    	that.aire2.brightness(255);
	    }

	    // development
	    that.liq_a.on('hold', function(data){
	    	that.sendSocketAndMaybeStoreRegistry(Storage.data.LiquidoA, positiveValue, counterLiquidsA, true);
	    });

	    that.liq_a.on('up', function(data){
	    	that.sendSocketAndMaybeStoreRegistry(Storage.data.LiquidoA, negativeValue, counterLiquidsA, false);
	    });

	    that.liq_b.on('hold', function(data){
	    	that.sendSocketAndMaybeStoreRegistry(Storage.data.LiquidoB, positiveValue, counterLiquidsB, true);
	    });

	    that.liq_b.on('up', function(data){
	    	that.sendSocketAndMaybeStoreRegistry(Storage.data.LiquidoB, negativeValue, counterLiquidsB, false);
	    });

	     that.liq_c.on('hold', function(data){
	    	that.sendSocketAndMaybeStoreRegistry(Storage.data.LiquidoC, positiveValue, counterLiquidsC, true);
	    });

	    that.liq_c.on('up', function(data){
	    	that.sendSocketAndMaybeStoreRegistry(Storage.data.LiquidoC, negativeValue, counterLiquidsC, false);
	    });

	    that.hum_a.on('hold', function(data){
	    	that.sendSocketAndMaybeStoreRegistry(Storage.data.Humo, positiveValue, counterSmog, true);
	    });

	    that.hum_a.on('up', function(data){
	    	that.sendSocketAndMaybeStoreRegistry(Storage.data.Humo, negativeValue, counterSmog, false);
	    });

		    that.alarmaButton.on("down", function(data){
			that.setAlertState(true);
		    });

		    that.alarmaButton.on("up", function(data){
			that.setAlertState(false);
		    });
		 
	    that.t_rack.on('data', function() {
		/*
		 var  tr = (5 * this.value * 100) / 1024;
		 var  tro = tr.toFixed(2);
		 */
		});

	    that.luz_1.on('hold', function(){
	    	console.log("==========================================================");
	    	console.log("====================== X =================================");
	    	console.log("==========================================================");
	    	that.sendSocketAndMaybeStoreRegistry(Storage.data.Luz_1, positiveValue, 0, false);
	    });
	    that.luz_1.on('up', function(){
	    	console.log("==========================================================");
	    	console.log("====================== X =================================");
	    	console.log("==========================================================");
	    	that.sendSocketAndMaybeStoreRegistry(Storage.data.Luz_1, negativeValue, 0, false);
	    });
	    that.luz_2.on('hold', function(){
	    	that.sendSocketAndMaybeStoreRegistry(Storage.data.Luz_2, positiveValue, 0, false);
	    });
	    that.luz_2.on('up', function(){
	    	that.sendSocketAndMaybeStoreRegistry(Storage.data.Luz_2, negativeValue, 0, false);
	    });
	    that.aire_1.on('hold', function(){
	    	that.sendSocketAndMaybeStoreRegistry(Storage.data.Aire_1, positiveValue, 0, false);
	    });
	    that.aire_1.on('up', function(){
	    	that.sendSocketAndMaybeStoreRegistry(Storage.data.Aire_1, negativeValue, 0, false);
	    });

	    
	    lcd.on("ready", function() {});

		var refrescarLCD = function(act){
			lcd.on("ready", function() { console.log("lcd ready"); });
			if(act === 1){
				lcd.on("ready", function() { console.log("lcd ready"); });
				lcd.clear();
				lcd.print("Temperatura:");
				lcd.print(cel);
				lcd.cursor(1, 0);
				lcd.print("Humedad :");
				lcd.print(hum);
			}
			else{
				lcd.on("ready", function() { console.log("lcd ready"); });
				lcd.clear();
			}
		}; 

	    lcdButton.on('hold', function(){
	    	console.log("LCD");
	    	refrescarLCD(1);
	    });

	    lcdButton.on('up', function(){
	    		refrescarLCD(0);
	    });

	    
	   		
	    that.board.repl.inject({
	    	lcd: lcd
	    });

	});
	
};

};
Monitduino.prototype.setupSerialPort = function() {
	var that = this;
    /* 
     * initS : 
     * A callback is supposed to be passed, when is opened, we do something. 
     */
     serialPort.on('open',function() {});

    /* 
     * dataS : 
     * Accepts a function that reacts each time some data is collected. 
     * The function should receive as parameter an object, that object
     * has the following schema:
     *  {Celsius: 1, Humedad: 2}
     */

     serialPort.on('data', function(data) {

        //recolecta info del puerto serial
        var info = data;
        var object = {
        	Celsius: '',
        	Humedad: '' 
        };
        // verificar la informacion
        console.log(info);
        var ok = regexp.test(info);
        if(ok){
        	time++;
        	var ext = info.split(","); 			
        	//recoge la temperatura
                var celsius = parseFloat(ext[1]); 	
        	cel = celsius;
        	//recoge la humedad.
        	hum_ = parseFloat(ext[0]);
        	hum = hum_;
        	// result object
        	object  = {
        		Celsius: celsius,
        		Humedad: hum_
        	};
        	if(time === 1){
        		var alertForTemperature = (object.Celsius >= Storage.schemas.Temperatura.schema.max);
        		var alertForHumidity = (object.Humedad >= Storage.schemas.Humedad.schema.max);
        		that.sendSocketAndMaybeStoreRegistry(Storage.data.Celsius, object.Celsius, counterTemperature, alertForTemperature ? true : false);
        		that.sendSocketAndMaybeStoreRegistry(Storage.data.Humedad, object.Humedad, counterHumidity, alertForHumidity ? true : false);
        		time = 0;
        	}

        }
        else {
        	//console.log("Puerta");
        	var puerta = info;
	        var infoPuerta = info.split(",");
        	var pstado = 0;
        	var pusuario = 0;
        	var pusuarioe = 0;
                var tmpPredicate = true;
        	if (infoPuerta[0] === "U1")
        	{
        		//console.log("Usuario Numero 1");
        	    pusuario = 1;
        	    that.sendSocketAndMaybeStoreRegistry(Storage.data.Usuario, pusuario, counterDoor, tmpPredicate);
		    tmpPredicate = false;
		    setTimeout(function(){tmpPredicate = true;}, 2000);
        	}
        	else if (infoPuerta[0] === "U2")
        	{
        	    console.log("Usuario Numero 2");
        	    pusuario = 2;
        	    that.sendSocketAndMaybeStoreRegistry(Storage.data.Usuario, pusuario, counterDoor, tmpPredicate);
		    tmpPredicate = false;
		    setTimeout(function(){tmpPredicate = true;}, 2000);
        	}
        	/*
        	else 
        	{
        		//console.log("Usuario Desconocido")
        		pusuario = 10;
        		that.sendSocketAndMaybeStoreRegistry(Storage.data.Usuario, pusuario, counterDoor, false);
        	}
        	*/
        	if (infoPuerta[1] === "UC")
        	{
        		//console.log("Usuario Correcto");
        		pusuarioe = 11;
        		that.sendSocketAndMaybeStoreRegistry(Storage.data.Usuario, pusuarioe, counterDoor, true);
        	}
        	else if (infoPuerta[1] === "UI")
        	{
        		//console.log("Usuario Incorrecto");
        		pusuarioe = 12;
        		that.sendSocketAndMaybeStoreRegistry(Storage.data.Usuario, pusuarioe, counterDoor, true);
        	}
        	if (puerta == "AOP" || puerta == "OP" || puerta == "EOP" || puerta == "CP"){
        		console.log("estado puerta :" + puerta);
        		if(puerta == "OP")
        		{	
        			pstado = 1;
    				that.sendSocketAndMaybeStoreRegistry(Storage.data.Puerta, pstado, counterDoor, true);
        		}
        		if(puerta == "AOP" || puerta == "EOP")
        		{
        			pstado = 2;
        			that.sendSocketAndMaybeStoreRegistry(Storage.data.Puerta, pstado, counterDoor, true);
        		}
        		if(puerta == "CP")
        		{
        			pstado = 3;
        			that.sendSocketAndMaybeStoreRegistry(Storage.data.Puerta, pstado, counterDoor, true);
        		}
        	}
        }					

    });
};

module.exports = Monitduino;
