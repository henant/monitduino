var Storage = new require("./storage"),
    storage = new Storage();
var socketIO;
var five = require("johnny-five"),
    com = require("serialport");
var serialPort = new com.SerialPort("/dev/ttyUSB0", {
    baudrate: 9600,
    parser: com.parsers.readline('\r\n')
});
var time = 0;
var l_a = 0;
var l_b = 0;
var h = 0;
var counterLiquidsA = 0;
var counterLiquidsB = 0;
var counterTemperature = 0;
var counterHumidity = 0;
var counterSmog = 0;

var Monitduino = function(){
    this.socketIO = null;
    this.liq_a = null;
    this.liq_b = null;
    this.liq_c = null;
    this.hum_a = null;
    this.t_track = null;
    this.board = five.Board();    
};

Monitduino.prototype.sendSocketAndMaybeStoreRegistry = function(name, value, counter, store) {
    var registry = {name: name, value: value};
    if (counter >= 30 || store) {
	storage.createRegistry(registry.name, registry.value);
	counter = 0;
    }
    counter++; 
    if (socketIO) {
	socketIO.emit('general', registry);    
    }
    return registry;
};

Monitduino.prototype.setSocket = function(io){
    this.socketIO = io;
};

var negativeValue = "0", positiveValue = "1";

Monitduino.prototype.pepareBoard = function ()  {
    var that = this;
    if (that.board) {
	that.board.on("ready", function(){

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

	    that.hum_a = new five.Button({
		board: that.board,
		pin: 24,
		holdtime: 3000,
		invert: false
	    });

	    that.t_rack = new five.Sensor({
		pin: "A0",
		freq: 30000
	    });

	    // development

	    that.liq_a.on('hold', function(data){
		var registry = that.sendSocketAndMaybeStoreRegistry(Storage.data.LiquidoA, positiveValue, counterLiquidsA, true);
	    });

	    that.liq_a.on('up', function(data){
		var object = that.sendSocketAndMaybeStoreRegistry(Storage.data.LiquidoA, negativeValue, counterLiquidsA, false);
	    });

	    that.liq_b.on('hold', function(data){
		var object = that.sendSocketAndMaybeStoreRegistry(Storage.data.LiquidoB, positiveValue, counterLiquidsB, true);
	    });

	    that.liq_b.on('up', function(data){
		var object = that.sendSocketAndMaybeStoreRegistry(Storage.data.LiquidoB, negativeValue, counterLiquidsB, false);
	    });

	    that.hum_a.on('hold', function(data){
		var object = that.sendSocketAndMaybeStoreRegistry(Storage.data.Humo, positiveValue, counterSmog, true);
	    });

	    that.hum_a.on('up', function(data){
		var object = that.sendSocketAndMaybeStoreRegistry(Storage.data.Humo, negativeValue, counterSmog, false);
		return object;
	    });

	    that.t_rack.on('data', function() {
		/*
		 var  tr = (5 * this.value * 100) / 1024;
		 var  tro = tr.toFixed(2);
		 */
	    });

	});
    };
};

Monitduino.prototype.setSerialPort = function() {
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
	time++;
	//recolecta info del puerto serial
	var info = data; 					
	//divide la informacion (Hum, Temp)
	var ext = info.split(","); 			
	//recoge la temperatura
	var celsius = parseFloat(ext[1]); 	
	//recoge la humedad.
	var hum_ = parseFloat(ext[0]);		
	// result object
	var object  = {
            Celsius: celsius,
            Humedad: hum_
	};
	if(time === 5){
	    var alertForTemperature = (object.Celsius >= Storage.schemas.Temperatura.schema.max);
	    var alertForHumidity = (object.Humedad >= Storage.schemas.Humedad.schema.max);
	    that.sendSocketAndMaybeStoreRegistry(Storage.data.Celsius, object.Celsius, counterTemperature, alertForTemperature ? true : false);
	    that.sendSocketAndMaybeStoreRegistry(Storage.data.Humedad, object.Humedad, counterHumidity, alertForHumidity ? true : false);
            time = 0;
	}
    });

};

module.exports = Monitduino;
