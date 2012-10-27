var DEBUG = false;
var CONFIG = { standalone: true, https: true };

var https = require('https');
var http = require('http');
var io = require('socket.io');
var util = require('util');
var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');

var socketIOClients = new Array();
var messageQueue = new Array();

var server;
if(CONFIG.standalone)
{
        if(CONFIG.https)
        {
                var serverCerts = {
                        key: fs.readFileSync('ServerConfig/server.key'),
                        cert: fs.readFileSync('ServerConfig/server.cert')
                };

                server = https.createServer(serverCerts, ServerMain);
                server.listen('443');
        }
        else
        {
                server = http.createServer(ServerMain);
                server.listen('80');
        }
}
else
{
        server = http.createServer(function(){});
        server.listen('1337');
}
var socket = io.listen(server);

setupSocketIOOptions();
setupSocketIOEventHandlers();

setInterval(sendEpochTime, 1000);

function sendEpochTime()
{
	var dateUtil = new Date();

	var epochTime = parseInt(dateUtil.getTime()/1000);

	socketIOClients.every(function(entry)
	{
		entry.volatile.emit('data', { type: "timeSync", data: epochTime });
		entry.broadcast.volatile.emit('data', { type: "timeSync", data: epochTime });

		return false;
	});
}

function ServerMain(request, response)
{
        var request_uri = './'+path.normalize('./'+((request.url == '' || request.url == '/')?'index.html':request.url));

        fs.exists(request_uri, function(exists)
        {
                if(exists)
                {
                        fs.readFile(request_uri, function(error, content)
                        {
                                if(error)
                                {
                                        response.writeHead(500);
                                        response.end();
                                }
                                else
                                {
                                        response.writeHead(200, { 'Content-Type': getContentType(request_uri) });
                                        response.end(content, 'utf-8');
                                }
                        });
                }
                else
                {
                        response.writeHead(404);
                        response.end();
                }
        });
}

function setupSocketIOEventHandlers()
{
	socket.on('connection', createSocketIOClient);
}

function setupSocketIOOptions()
{
	socket.enable('browser client minification');
	socket.enable('browser client etag');
	socket.enable('browser client gzip');
	socket.set('log level', 0);
	if(DEBUG) socket.set('log level', 3);
	socket.set('transports',
		[
			'websocket',
			//'flashsocket',
			'htmlfile',
			'xhr-polling',
			'jsonp-polling'
		]
	);
}

function removeSocketIOClient()
{
	if(DEBUG) console.log('Client '+this.store.data.clientID+' Disconnected');
	socketIOClients = socketIOClients.splice(this);
}

function createSocketIOClient(client)
{
	if(DEBUG) console.log('Client '+(socketIOClients.length+1)+' Connected');

	client.set('clientID', socketIOClients.length+1);
	client.on('disconnect', removeSocketIOClient);

	socketIOClients.push(client);
}
