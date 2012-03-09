/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , WebSocketServer = require('websocket').server;

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

//app.get('/', routes.index);

// Web Socket

var ConnectionPool = function () {};
ConnectionPool.prototype = [];
ConnectionPool.prototype.releaseConnection = function (connection) {
  var released = false, i, slice;
  slice = Array.prototype.slice;
  for (i = 0; i < arguments.length; i+=1) {
    if (connection === arguments[i]) {
      slice.apply(arguments, [i, 1]);
      released = true;
    }
  }
  return released;
};

var ConnectionPoolMap = function() {};
ConnectionPoolMap.prototype.data = {};
ConnectionPoolMap.prototype.releaseConnection = function(connection) {
  var released = false, k;
  for (k in this.data) {
    if (this.data[k].releaseConnection(connection)) {
      released = true;
    }
  }
  return released;
};
ConnectionPoolMap.prototype.put = function(key, connection) {
  if (typeof this.data[key] === "undefined") {
    this.data[key] = new ConnectionPool();
  }
  this.data[key].push(connection);
};

var parentConnections         = new ConnectionPoolMap();
var childConnections          = new ConnectionPoolMap();
var remoteControllConnections = new ConnectionPoolMap();
var connectionPools = [parentConnections, childConnections, remoteControllConnections];

var ScrollRockCommands = function() {};
ScrollRockCommands.prototype.commands = {};
ScrollRockCommands.prototype.execute = function(request, connection, command) {
  if (!command instanceof Object) {
    return false;
  }

  if (command.length < 1) {
    return false;
  }

  var keys = Object.keys(command)
    , name = keys[0];

  if (!command[name] instanceof Object) {
    return false;
  }

  if (this.commands[name] instanceof Function) {
    return this.commands[name].apply(this, [{
        'request'   : request,
        'connection': connection,
        'params'    : command[name]
    }]);
  }

  return false;
};
ScrollRockCommands.prototype.addCommand = function(name, callback) {
  this.commands[name] = callback;
};
ScrollRockCommands.prototype.randomString = function(len) {
   var array = [], i, str = "";
   for(i = 0; i < 10; i+=1) {
     array.push(String.fromCharCode('0'.charCodeAt() + i));
  }
   for(i = 0; i < 26; i+=1) {
     array.push(String.fromCharCode('a'.charCodeAt() + i));
   }
   for(i = 0; i < 26; i+=1) {
     array.push(String.fromCharCode('A'.charCodeAt() + i));
   }
   for(i = 0; i < len; i+=1) {
     str += array[Math.floor(Math.random() * array.length)];
   }

   return str;
};
var commands = new ScrollRockCommands();
commands.addCommand('parent', function(data) {
  var response = {'operate': 'parent', 'message': 'fail'}
    , token1 = this.randomString(5)
    , token2 = this.randomString(5);
  if (typeof data.connection.type !== 'undefined') {
    data.connection.send(response);
    return false;
  }

  data.connection.type   = 'parent';
  data.connection.token1 = token1;
  data.connection.token2 = token2;
  data.connection.controll = true;

  parentConnections.put(token1, data.connection);

  response['token1'] = token1;
  response['token2'] = token2;
  data.connection.send(response);

  return true;
});

commands.addCommand('child', function(data) {
  var response = {'operate': 'child', 'message': 'fail'};

  if (typeof data.connection.type !== 'undefined') {
    data.connection.send(response);
    return false;
  }

  if (typeof data.params['token'] === 'undefined') {
    data.connection.send(response);
    return false;
  }

  var token1 = data.params['token'];
  if (typeof parentConnections.data[token1] === 'ConnectionPool') {
    data.connection.send(response);
    return false;
  }

  data.connection.token1 = token1;
  data.connection.type = 'child';
  data.connection.controll = false;
  childConnections.put(token, data.connection);

  response['message'] = 'connected';
  response['token1']  = token1;
  data.connection.send(response);
  return true;
});
commands.addCommand('update', function(data) {
  var response = {'operate': 'update', 'message': 'fail'};
  if (data.connection.type !== 'parent') {
    data.connection.send(response);
    return false;
  }

  var token1 = data.connection.token1;
  childConnections.data[token1].forEach(function(con) {
    con.send({'operate': 'update', 'message': '', 'params': data.params});
  });

  return true;
});
commands.addCommand('goto', function(data) {
  var response = {'operate': 'goto', 'message': 'fail'};
  if (!data.connection.controll) {
    data.connection.send(response);
    return false;
  }

  var token1 = data.connection.token1;
  parentConnections[token1][0].send({'operate': 'goto', 'message': '', 'params': data.params});

  return true;
});
commands.addCommand('gotos', function(data) {
  var response = {'operate': 'gotos', 'message': 'fail'};
  if (!data.connection.controll) {
    data.connection.send(response);
    return false;
  }

  var token1 = data.connection.token1;
  parentConnections[token1][0].send({'operate': 'gotos', 'message': '', 'params': data.params});

  return true;
});
commands.addCommand('rcontroll', function(data) {
  var response = {'operate': 'rcontroll', 'message': 'fail'};
  if (typeof data.connection.type !== 'undefined') {
    data.connection.send(response);
    return false;
  }

  if (typeof data.params['token'] === 'undefined') {
    data.connection.send(response);
    return false;
  }

  var token = data.params['token'];
  if (token.length !== 10) {
    data.connection.send(response);
    return false;
  }

  var token1 = token.substr(0, 5);
  var token2 = token.substr(5);
  if (typeof parentConnections.data[token1] === 'ConnectionPool') {
    data.connection.send(response);
    return false;
  }

  var parentCons = parentConnections.data[token1];
  if (parentCons.length < 1) {
    data.connection.send(response);
    return false;
  }

  if (parentCons[0].token2 !== token2) {
    data.connection.send(response);
    return false;
  }

  data.connection.token1 = token1;
  data.connection.type = 'rcontroll';
  data.connection.controll = true;
  remoteControllConnections.put(token1, data.connection);

  response['message'] = 'rcontroll';
  response['token1']  = token1;
  data.connection.send(response);

  return true;
});


var ws = new WebSocketServer({
  httpServer : app,
  autoAcceptConnections: false
});

ws.on('request', function (request) {
  var connection;
  try {
    connection = request.accept('scrollrock', request.origin);
    connection.on('message', function(message) {
      if (message.type !== 'utf8') {
        return;
      }

      var command = JSON.parse(message.utf8Data);
      commands.execute(request, connection, command);
    });

    connection.on('close', function() {
      connectionPools.forEach(function(cp) {
        if (cp.releaseConnection(connection)) {
          return false;
        }
      });
    });
  } catch (e) {
    request.reject();
  }
});


app.listen(3333);

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
