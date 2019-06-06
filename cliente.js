#!/usr/bin/env node

console.log('Especificado= ' + 'http://' + process.argv[2] + ':' + process.argv[3]);

var ip_puerto = 'http://' + process.argv[2] + ':' + process.argv[3]

const socket = require('socket.io-client')(ip_puerto);
var cmd = require('node-cmd');
var { exec } = require('child_process');
const { spawn } = require('child_process');
const fs = require('fs');  
const Path = require('path'); 
const Axios = require('axios');
var async = require('async');
var moment = require('moment');

var fecha = moment().format('DD MMMM YYYY, h:mm:ss a'); // May 1st 2019, 10:59:20 pm

//console.log(fecha);

const someDelay = 10;

'use strict'

/******************** Obtener regla ********************/

async function obtenerRegla (archivoregla) {  
  const url = ip_puerto + "/reglas/" + archivoregla;
  //console.log(url);
  const path = Path.resolve(__dirname, 'reglas', archivoregla);
  //console.log(path);
  const writer = fs.createWriteStream(path)

  const response = await Axios({
    url,
    method: 'GET',
    responseType: 'stream'
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  });
}

/******************** On connect ********************/

socket.on('connect', function () {
    console.log("\nSocket conectado...");
    var os = require('os');
    var ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;
    ifaces[ifname].forEach(function (iface) {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }
    if (alias >= 1) {
      // this single interface has multiple ipv4 addresses
      console.log(ifname + ':' + alias, iface.address);
    } else {
      //this interface has only one ipv4 adress
      //console.log(ifname, iface.address);
      console.log("Enviando IP=" + iface.address + " al servidor central...");
      console.log("Esperando instrucciones...\n");
    }
    ++alias;

    socket.emit('net', iface.address);
  });
});


/******************** Ejecutar regla ********************/

socket.on('ejecutar-regla', function(datos){
  
  console.log("Evento 'ejecutar-regla' activado satisfactoriamente...");
  console.log("Ejecutando regla: " + datos.regla);
  console.log("Escaneando en ruta: " + datos.ruta); 

  var datos = {
      regla: datos.regla,
      ruta: datos.ruta
    }

    obtenerRegla(datos.regla);

    var child = spawn('cmd' , ['/c', 'c:\\cliente\\yara64.exe -r ' + 'c:\\cliente\\reglas\\' + datos.regla + ' ' + datos.ruta]);
    //var child = spawn('yara64.exe' , ['-r ' + 'reglas\\' + datos.regla + ' ' + datos.ruta]);

  child.stdout.on('data',
    function (data) {
        console.log('\nArchivos maliciosos:\n' + data);
      fs.appendFileSync("c:\\cliente\\temp.txt", data, (err) => {
     	 if (err) console.log(err);
     	 console.log("Información almacenada en temp.txt.");
      });
  });
   
   child.stderr.on('data', function (data) {
         fs.appendFileSync("c:\\cliente\\errorlog.txt", data, (err) => {
     	/* if (err) console.log(err);
     	console.log(data);*/
     	 
      });
        //console.log("Información almacenada en errorlog.txt.");
   });

    child.on('close', function (code) {
        console.log('Proceso terminado con código: ' + code);
    });

/*var allLines = fs.readFileSync('temp.txt').toString().split('\n');
fs.writeFileSync('temp2.txt', '', function(){console.log('file is empty')})
allLines.forEach(function (line) { 
    var newLine = line + "candy";
    console.log(newLine);
    fs.appendFileSync("temp2.txt", newLine.toString() + "\n");
});
*/

/**************** con Exec *******************/
/*  var comando = 'c:\\cliente\\yara64.exe -r ' + 'c:\\cliente\\reglas\\' + datos.regla + ' ' + datos.ruta
    exec(comando, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`\nArchivos infectados:\n${stdout}` + '\n');
      //fs.writeFile()...
      fs.appendFileSync("c:\\cliente\\temp.txt", stdout, (err) => {
     	 if (err) console.log(err);
     	 console.log("Información almacenada en temp.txt.");
      });
      //console.log(`Error log:\n${stderr}`);
	/*	 fs.writeFile("c:\\cliente\\errorlog.txt", stderr, (err) => {
		     if (err) console.log(err);
		     console.log("Información almacenada en errorlog.txt.");
		  });
		 console.log('Proceso terminado con código: 0');
    });*/
    //console.log('Proceso terminado con código: 0');
});


/******************** Obtener resultados ********************/

socket.on('obtener-resultados', function (fn) {
    
 

  console.log("Evento 'obtener-resultados' activado satisfactoriamente...");
  console.log("Leyendo archivo temp.txt...");
  
  var content = '';
  // First I want to read the file
  //fs.readFile('temp.txt', 'utf-8', function read(err, data) {
  fs.readFile('c:\\cliente\\temp.txt', 'utf-8', function read(err, data) {
      if (err) {
          throw err;
      }
      //console.log('type of data = ' + typeof(data));
      content = data;
      console.log(content);

      // Invoke the next step here however you like
      //console.log('content = ' + content);   // Put all of the code here (not the best solution)
      //processFile();          // Or put the next step in a function and invoke it
    fn(content);
  });
  console.log(content);


}); 


/******************** Eliminar archivos ********************/

socket.on('eliminar-archivos', function (datos, fn) {
 
  console.log("Evento 'eliminar-archivos' activado satisfactoriamente...");

  var datos = {
      rutas: datos.rutas
  }

  var eliminadosExito = [];
  var eliminadosError = [];


	for (var i=0; i<((datos.rutas).length); i++){

	    var comando = 'del ' + datos.rutas[i];

	   exec(comando, (error, stdout, stderr) => {
	      if (error) {
	        console.error(`exec error: ${error}`);
	        return;
	      }
	      if (stdout == '') {
	      	console.log('archivo eliminado');
	      }
	     console.log(`\nstdout: ${stdout}` + '\n');
	     console.log(`\nstderr: ${stderr}` + '\n');
	     eliminadosError.push([stdout, stderr]);

	    fs.appendFileSync("c:\\cliente\\errorArchivos.txt", stdout, (err) => {
	     	if (err) console.log(err);
	     	console.log(stdout); 
	     });

      	
 		});
	}

	var arrayFinal = setTimeout(function() {
		fn(eliminadosError);
	    //console.log('arreglo final=' + eliminadosError);
	  }, 5000);
	
});

});