$(document).ready(function() {
    var mapOptions = {
        center: new google.maps.LatLng(48.118205, -1.676102),
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    var map = new google.maps.Map(document.getElementById('map'), mapOptions);
    
    Keolis.app = new Backbone.Marionette.Application();
    Keolis.app.addRegions({
        data: '#data'
    });
    
    Keolis.app.on('initialize:after', function(options) {
        Keolis.stations = new Keolis.StationCollection();
        Keolis.stations.fetch({
            success: function(collection, response, options) {
                console.log('We fetched ' + collection.length + ' stations !');
                collection.each(function(station) {
                    var view = new Keolis.StationView({
                        model: station,
                        map: map
                    });
                    view.on('station:show', function(event) {
                        var graphView = new Keolis.StationGraphView({
                            model: station
                        });
                        Keolis.app.data.show(graphView);
                    });
                });
            }
        });
        var socket = io.connect();
        socket.on('station:update', function(data) {
            var station = Keolis.stations.get(data._id);
            if (!station) {
                console.log('Damn I can\'t find the station');
                return;
            }
    
            // Updating the records
            station.set({ 'records': station.get('records').concat(data.records) }, { silent : true });;
            while (station.get('records').length > station.get('maxRecords')) {// We only keep 1 week of data
                station.set({ 'records': station.get('records').shift() }, { silent : true });
            }
            // Updating the values
            var record = station.get('records')[station.get('records').length - 1];
            station.set({ 'slotsAvailablePerCent': 100 * record.slotsAvailable / (record.slotsAvailable + record.bikesAvailable) }, { silent : true });
            if (station.get('slotsAvailablePerCent') < 25) {
                station.set({ 'slotsClass': 'danger' }, { silent : true });
            } else if (station.get('slotsAvailablePerCent') < 50) {
                station.set({ 'slotsClass': 'warning' }, { silent : true });
            } else if (station.get('slotsAvailablePerCent') < 75) {
                station.set({ 'slotsClass': 'info' }, { silent : true });
            } else {
                station.set({ 'slotsClass': 'success' }, { silent : true });
            }
            station.set({ 'bikesAvailablePerCent': 100 * record.bikesAvailable / (record.slotsAvailable + record.bikesAvailable) }, { silent : true });
            if (station.get('bikesAvailablePerCent') < 25) {
                station.set({ 'bikesClass': 'danger' }, { silent : true });
            } else if (station.get('bikesAvailablePerCent') < 50) {
                station.set({ 'bikesClass': 'warning' }, { silent : true });
            } else if (station.get('bikesAvailablePerCent') < 75) {
                station.set({ 'bikesClass': 'info' }, { silent : true });
            } else {
                station.set({ 'bikesClass': 'success' }, { silent : true });
            }
            station.change();
        });
    });
    
    Keolis.app.start();
});

var Keolis = {};

Keolis.Station = Backbone.Model.extend({
    idAttribute: '_id',
    initialize: function(options) {
        var record = this.get('records')[this.get('records').length - 1];
        this.set('slotsAvailablePerCent', 100 * record.slotsAvailable / (record.slotsAvailable + record.bikesAvailable));
        if (this.get('slotsAvailablePerCent') < 25) {
            this.set('slotsClass', 'danger');
        } else  if (this.get('slotsAvailablePerCent') < 50) {
            this.set('slotsClass', 'warning');
        } else if (this.get('slotsAvailablePerCent') < 75) {
            this.set('slotsClass', 'info');
        } else  {
            this.set('slotsClass', 'success');
        } 
        this.set('bikesAvailablePerCent', 100 * record.bikesAvailable / (record.slotsAvailable + record.bikesAvailable));
        if (this.get('bikesAvailablePerCent') < 25) {
            this.set('bikesClass', 'danger');
        } else  if (this.get('bikesAvailablePerCent') < 50) {
            this.set('bikesClass', 'warning');
        } else if (this.get('bikesAvailablePerCent') < 75) {
            this.set('bikesClass', 'info');
        } else  {
            this.set('bikesClass', 'success');
        }
    },
    toGooglePoint: function() {
        return new google.maps.LatLng(this.get('latitude'), this.get('longitude'));
    }
});

Keolis.StationCollection = Backbone.Collection.extend({
    model: Keolis.Station,
    url: '/stations',
    initialize: function(options) {
    }
});

Keolis.StationView = Backbone.Marionette.ItemView.extend({
    el: $('#map'),
    initialize: function(options) {
        this.map = options.map;
        var self = this;
        this.render();
    },
    modelChanged: function() {
        var self = this;
        this.render();
    },
    render: function() {
        var self = this;
        if (!this.marker) {
            this.marker = new google.maps.Marker({
                position: this.model.toGooglePoint(),
                map: this.map,
                title: this.model.get('name')
            });
            google.maps.event.addListener(this.marker, 'click', function() {
                console.log('marker clicked !');
                self.trigger('station:show');
                self.showBubble();
            });
        } else {
            this.marker.setPosition(this.model.toGooglePoint());
        }
    },
    onClose: function() {
        this.marker.setMap(null);
        this.marker = null;
    },
    showBubble: function() {
        this.marker.bubble = new InfoBubble({
            content : _.template($('#stationDetailsTpl').html(), this.model.toJSON()),
            position : this.model.toGooglePoint(),
            borderRadius : 4,
            borderWidth : 1,
            minWidth : 300,
            maxWidth : 400,
            shadowStyle : 1
        }); 

        this.marker.bubble.open(this.map, this.marker);
    },
    hideBubble: function() {
        this.marker.bubble.close();
    }
});

Keolis.StationGraphView = Backbone.Marionette.ItemView.extend({
    template: '#stationGraphTpl',
    initialize: function(options) {
        console.log('Initialize graph view');
    },
    modelEvents: {
        'change': 'modelChanged'
    },
    modelChanged: function() {
        this.render();
    },
    onRender: function() {
        console.log('appel à onRender');
        var records = this.model.get('records');
        // Building data
        var slotsData = [];
        var bikesData = [];
        for (var i = 0; i < records.length; i++) {
            var record = records[i];
            var date = new Date(record.date);
            slotsData.push([date.getTime(), record.slotsAvailable]);
            bikesData.push([date.getTime(), record.bikesAvailable]);
        }
        this.chart = new Highcharts.Chart({
            chart : {
                renderTo : 'graph',
                type : 'spline',
                zoomType: 'x'
            },
            title : {
                text : 'Station ' + this.model.get('name')
            },
            subtitle : {
                text : 'Données d\'utilisation'
            },
            xAxis : {
                type : 'datetime'
            },
            yAxis : {
                title : {
                    text : 'Nombre'
                },
                min : 0
            },
            tooltip : {
                formatter : function() {
                    return '<b>' + this.series.name + '</b> : ' + this.y;
                }
            },
            series : [{
                name : 'Emplacements libres',
                data : slotsData
            }, {
                name : 'Vélos disponibles',
                data : bikesData
            }]
        });
    },
    onClose: function() {
        //this.chart.destroy();
    }
});
















