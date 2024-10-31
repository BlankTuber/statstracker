const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TeamSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    logo: {
        type: String,
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    games: [{
        type: Schema.Types.ObjectId,
        ref: 'Game'
    }],
    players: [{
        type: Schema.Types.ObjectId,
        ref: 'Player'
    }]
}, { timestamps: true });

const Team = mongoose.model('Team', TeamSchema);

module.exports = Team;