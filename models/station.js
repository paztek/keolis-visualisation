var mongoose = require('mongoose');

console.log('MODELS : Initialization of the stations');

var recordSchema = new mongoose.Schema({
    state: {
        type: Boolean,
        required: true
    },
    slotsAvailable: {
        type: Number,
        required: true
    },
    bikesAvailable: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    maxRecords: {
        type: Number,
        required: true,
        'default': 60 * 24 * 7
    }
});

var schema = new mongoose.Schema({
    number: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    lastUpdate: {
        type: Date,
        required: true
    },
    records: [recordSchema]
});

schema.pre('save', function(next) {
    while (this.records.length > 60 * 24 * 7) { // We only keep 1 week of data
        this.records.shift();
        this.markModified('records');
    }
    next();
});

module.exports = mongoose.model('Station', schema);