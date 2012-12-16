var mongoose = require('mongoose');

console.log('MODELS : Initialization of the records');

var schema = new mongoose.Schema({
    _station: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Station',
        required: true
    },
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
    }
});

module.exports = mongoose.model('Record', schema);
