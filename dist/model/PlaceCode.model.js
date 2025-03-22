"use strict";
const mongoose = require('mongoose');
const PlaceCodeSchema = new mongoose.Schema({
    p_code: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['sr', 'tsp'],
    },
}, { timestamps: true });
module.exports = mongoose.model('PlaceCode', PlaceCodeSchema, 'place_codes');
