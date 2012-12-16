var Station = require('./models/station');

var mongoose = require('mongoose'),
    querystring = require('querystring'),
    http = require('http'),
    async = require('async'),
    util = require('util'),
    config = require('./config');

mongoose.connect(config.dbUrl);

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
    console.log(options.host + ':' + res.statusCode);
    res.setEncoding('utf8');

    res.on('data', function(chunk) {
        output += chunk;
    });

    res.on('end', function() {
        var obj = JSON.parse(output);
        console.log(obj.opendata.request);
        //console.log(util.inspect(obj.opendata.answer.data.station));
        var stationsData = obj.opendata.answer.data.station;
        console.log(stationsData.length + ' stations récupérées');
        // Pour chaque station, on la crée si elle n'existe pas ou on l'update si elle se trouve déjà en base
        async.forEach(stationsData, function(stationData, callback) {
            console.log('Recherche de la station n°' + stationData.number);
            Station.findOne({ number: parseInt(stationData.number) }, function(err, station) {
                if (err) {
                    console.log(err);
                    return callback(err);
                }
                if (!station) {
                    console.log('Nouvelle station');
                    station = new Station(stationData);
                    console.log('Station : ' + station.name);
                    station.address = stationData.address;
                    station.latitude = parseFloat(stationData.latitude);
                    station.longitude = parseFloat(stationData.longitude);
                    station.district = stationData.district;
                    station.lastUpdate = new Date(stationData.lastupdate);
                    station.records.push({
                        _station : station._id,
                        state : (stationData.state == '1'),
                        slotsAvailable : parseInt(stationData.slotsavailable),
                        bikesAvailable : parseInt(stationData.bikesavailable),
                        date : new Date()
                    });

                    station.save(function(err) {
                        return callback(err);
                    });
                } else {
                    console.log('Station connue');
                    station.name = stationData.name;
                    console.log('Station : ' + station.name);
                    station.address = stationData.address;
                    station.latitude = parseFloat(stationData.latitude);
                    station.longitude = parseFloat(stationData.longitude);
                    station.district = stationData.district;
                    station.lastUpdate = new Date(stationData.lastupdate);
                    station.records.push({
                        _station : station._id,
                        state : (stationData.state == '1'),
                        slotsAvailable : parseInt(stationData.slotsavailable),
                        bikesAvailable : parseInt(stationData.bikesavailable),
                        date : new Date()
                    });

                    station.save(function(err) {
                        return callback(err);
                    });
                }
            });
        }, function(err) {
            if (err) throw err;
            mongoose.disconnect();
        });
    });
});

req.on('error', function(err) {
    console.log(err);
});

req.end();

