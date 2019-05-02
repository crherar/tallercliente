#!/usr/bin/env node
const socket = require('socket.io-client')('http://192.168.100.2:3000/');
var cmd = require('node-cmd');
var { exec } = require('child_process');

const someDelay = 10;

'use strict'

const Fs = require('fs')  
const Path = require('path')  
const Axios = require('axios')

async function obtenerRegla (archivoregla) {  
  const url = "http://192.168.100.2:3000/reglas/" + archivoregla;
  const path = Path.resolve(__dirname, 'reglas', archivoregla);
  const writer = Fs.createWriteStream(path)

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

const { spawn } = require('child_process');


socket.on('ejecutar-regla', function(datos){
  
  console.log("Evento 'ejecutar-regla' activado satisfactoriamente...");
  console.log("Ejecutando regla: " + datos.regla);
  console.log("Escaneando en ruta: " + datos.ruta); 

  var datos = {
      regla: datos.regla,
      ruta: datos.ruta
    }

    obtenerRegla(datos.regla);

    var child = spawn('cmd' , ['/c', 'yara64.exe -r ' + 'reglas\\' + datos.regla + ' ' + datos.ruta]);
	child.stdout.on('data',
		function (data) {
		    console.log('\nArchivos infectados:\n' + data);
	});
    child.stderr.on('data', function (data) {
        //throw errors
        console.log('Error log: ' + data);
    });

    child.on('close', function (code) {
        console.log('Proceso hijo terminado con codigo: ' + code);
    });

/****************   con Exec *******************/
/*   var comando = 'yara64.exe -r ' + 'reglas\\' + datos.regla + ' ' + datos.ruta;
    exec(comando, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`\nArchivos infectados:\n${stdout}` + '\n');
      console.log(`Error log:\n${stderr}`);

    });*/
});


socket.on('obtener-resultados', function(datos){
  
  console.log("Evento 'ejecutar-regla' activado satisfactoriamente...");
  console.log("Ejecutando regla: " + datos.regla);
  console.log("Escaneando en ruta: " + datos.ruta); 
  
  var datos = {
      regla: datos.regla,
      ruta: datos.ruta
    }

    obtenerRegla(datos.regla);

	const child = spawn('yara64.exe -r ' + 'reglas\\' + datos.regla + ' ' + datos.ruta);
    var comando = 'yara64.exe -r ' + 'reglas\\' + datos.regla + ' ' + datos.ruta;
    exec(comando, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`\nArchivos infectados:\n${stdout}` + '\n');
      console.log(`Error log:\n${stderr}`);

    });
});

});

