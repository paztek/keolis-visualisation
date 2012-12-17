
/**
 * Module dependencies.
 */

var express = require('express'),
    http = require('http'),
    util = require('util'),
    path = require('path'),
    mongoose = require('mongoose'),
    io = require('socket.io'),
    async = require('async'),
    querystring = require('querystring'),
    config = require('./config');
    
var Station = require('./models/station');
var Record = require('./models/record');

var app = express();

app.configure(function(){
    app.set('mode', process.env.NODE_ENV || 'development');
    app.set('port', process.env.PORT || 8081);
    app.set('apiKey', config.apiKey);
    app.set('refreshPeriod', config.refreshPeriod);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.locals.pretty = true;
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
    app.use(express.errorHandler());
});

mongoose.connect(config.dbUrl);

app.get('/', function(req, res, next) {
    return res.render('index');
});

app.get('/stations', function(req, res, next) {
    Station.find(function(err, stations) {
        if (err) return next(err);
        return res.json(stations);
    });
});

var server = http.createServer(app);

var sio = io.listen(server, {
    'log level': 0
});

sio.sockets.on('connection', function(socket) {
    console.log('A socket connected !');
});

// Pull the stations data every config.refreshPeriod
setInterval(function() {
    var options = {
        host: config.apiHost,
        path: config.apiPath + '?' + querystring.stringify({ version: config.apiVersion, key: config.apiKey, cmd: 'getbikestations' }),
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }
    var req = http.request(options, function(res) {
        var output = '';
        res.setEncoding('utf8');
    
        res.on('data', function(chunk) {
            output += chunk;
        });
    
        res.on('end', function() {
            var obj = JSON.parse(output);
            console.log(obj.opendata.request);
            var stationsData = obj.opendata.answer.data.station;
            console.log(stationsData.length + ' stations récupérées');
            // Pour chaque station, on la crée si elle n'existe pas ou on l'update si elle se trouve déjà en base
            async.forEach(stationsData, function(stationData, callback) {
                Station.findOne({ number: parseInt(stationData.number) }, function(err, station) {
                    if (err) {
                        console.log(err);
                        return callback(err);
                    }
                    if (!station) {
                        station = new Station(stationData);
                        station.address = stationData.address;
                        station.latitude = parseFloat(stationData.latitude);
                        station.longitude = parseFloat(stationData.longitude);
                        station.district = stationData.district;
                        station.lastUpdate = new Date(stationData.lastupdate);
                        station.save(function(err) {
                            return callback(err);
                        });
                    } else {
                        station.name = stationData.name;
                        station.address = stationData.address;
                        station.latitude = parseFloat(stationData.latitude);
                        station.longitude = parseFloat(stationData.longitude);
                        station.district = stationData.district;
                        station.lastUpdate = new Date(stationData.lastupdate);
                        var record = {
                            _station : station._id,
                            state : (stationData.state == '1'),
                            slotsAvailable : parseInt(stationData.slotsavailable),
                            bikesAvailable : parseInt(stationData.bikesavailable),
                            date : new Date()
                        };
                        station.records.push(record);
    
                        station.save(function(err) {
                            sio.sockets.emit('station:update', {
                                _id: station._id,
                                records: [record]
                            });
                            return callback(err);
                        });
                    }
                });
            }, function(err) {
                if (err) throw err;
            });
        });
    });
    
    req.on('error', function(err) {
        console.log(err);
    });
    
    req.end();
}, config.refreshPeriod * 1000);

server.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port') + ' in ' + app.get('mode') + ' mode');
});
