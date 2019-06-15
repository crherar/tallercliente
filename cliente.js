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
      return;
    }
    if (alias >= 1) {
      console.log(ifname + ':' + alias, iface.address);
    } else {

      console.log("Enviando IP=" + iface.address + " al servidor central...");
      console.log("Esperando instrucciones...\n");
    }
    ++alias;

    socket.emit('net', iface.address);
  });
});


/******************** Ejecutar regla ********************/

socket.on('ejecutar-regla', function(datos, fn){
  
  console.log("Evento 'ejecutar-regla' activado satisfactoriamente...");
  console.log("Ejecutando regla: " + datos.regla);
  console.log("Escaneando en ruta: " + datos.ruta); 

  var datos = {
      regla: datos.regla,
      ruta: datos.ruta
    }

    obtenerRegla(datos.regla);

  var child = spawn('cmd' , ['/c', 'c:\\cliente\\yara64.exe -r ' + 'c:\\cliente\\reglas\\' + datos.regla + ' ' + datos.ruta]);

  child.stdout.on('data',
    function (data) {
        console.log('\nArchivos maliciosos:\n' + data);
      fs.writeFile("c:\\cliente\\temp.txt", data, (err) => {
     	 if (err) console.log(err);
     	 console.log("Información almacenada en temp.txt.");
      });
/*      fs.appendFileSync("c:\\cliente\\temp.txt", data, (err) => {
     	 if (err) console.log(err);
     	 console.log("Información almacenada en temp.txt.");
      });*/
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
        fn(code);
    });
    

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

correrCiclo = async(rutas) => {
	for (var i=0; i<rutas.length; i++) {

		console.log(rutas);

		await new Promise (resolve => {
			setTimeout(resolve, 1000)
			borrarLineas(rutas[i])
		});		
	}
}



function borrarLineas(ruta) {

		console.log('eliminando ruta ' + ruta + ' del archivo.');

		fs.readFile('temp.txt', {encoding: 'utf-8'}, function(err, data) {
    		if (err) throw error;

		    let dataArray = data.split('\n'); // convert file data in an array
		    const searchKeyword = ruta; // we are looking for a line, contains, key word 'user1' in the file
		    let lastIndex = -1; // let say, we have not found the keyword

		    for (let index=0; index<dataArray.length; index++) {
		        if (dataArray[index].includes(searchKeyword)) { // check if a line contains the 'user1' keyword
		            lastIndex = index; // found a line includes a 'user1' keyword
		            break; 
		        }
		    }

	    dataArray.splice(lastIndex, 1); // remove the keyword 'user1' from the data Array

	    const updatedData = dataArray.join('\n');

	    fs.writeFile('temp.txt', updatedData, (err) => {
	        if (err) throw err;
	        console.log ('Successfully updated the file data');
	    	});
		});
}



/******************** Eliminar archivos ********************/

socket.on('eliminar-archivos', function (datos, fn) {
 
  console.log("Evento 'eliminar-archivos' activado satisfactoriamente...");


  var rutas = datos;
  console.log(rutas);
  var eliminadosExito = [];
  var eliminadosError = [];
  var eliminadosErrorAux = [];

	for (var i=0; i<rutas.length; i++){
		//console.log('rutas[' + i + ']=' + rutas[i]);
		rutas[i] = rutas[i].replace(/(\r\n|\n|\r)/gm,"");
	}

	for (var i=0; i<(rutas.length); i++){

	   var comando = 'del ' + '"' + rutas[i] + '"';
	   exec(comando, (error, stdout, stderr) => {
	      if (error) {
	        console.error(`exec error: ${error}`);
	        return;
	      }
	      if (stdout == '' & stderr == '') { // caso en que el archivo si se elimino
	      	console.log(`\nstdout: ${stdout}` + '\n');
	      	console.log(`\nstderr: ${stderr}` + '\n');
	      } else { // caso en que el archivo no se elimino por algun motivo
	      	console.log(`\nstdout: ${stdout}` + '\n');
	      	console.log(`\nstderr: ${stderr}` + '\n');
	      	if (stderr.includes('Could Not Find')){
	      		var rutaArchivo = stderr.substr(15);
	      		console.log('RUTA ARCHIVO= ' + rutaArchivo);
	      		stdout = rutaArchivo;

	      	}
	      	eliminadosError.push([stdout, stderr]);
	      	eliminadosErrorAux.push(stdout);
	      }	   
 		});
	}

	setTimeout(function() {

		for (var i=0; i<rutas.length; i++){
			//console.log('rutas[' + i + ']=' + rutas[i]);
			rutas[i] = rutas[i].replace(/(\r\n|\n|\r)/gm,"");
		}

		for (var i=0; i<eliminadosErrorAux.length; i++){
			//console.log('eliminadosErrorAux[' + i + ']=' + eliminadosErrorAux[i]);
			eliminadosErrorAux[i] = eliminadosErrorAux[i].replace(/(\r\n|\n|\r)/gm,"");
		}


		var eliminadosExito = rutas.filter(x => !eliminadosErrorAux.includes(x));

		for (var i=0; i<eliminadosExito.length; i++){
			//console.log('eliminadosErrorAux[' + i + ']=' + eliminadosErrorAux[i]);
			eliminadosExito[i] = eliminadosExito[i].replace(/(\r\n|\n|\r)/gm,"");
		}

		console.log('Archivos eliminados con exito:\n' + eliminadosExito + '\n');
		console.log('No se pudieron eliminar:\n' + eliminadosErrorAux + '\n');

		correrCiclo(eliminadosExito);

		fn({eliminadosExito, eliminadosError});

	}, 1000);

});

});