const express = require('express');
const router = express.Router();

const Team = require('../models/Team');
const Player = require('../models/Player');
const User = require('../models/User');
const Game = require('../models/Game');

router.post('/addPlayer', function (req, res) {
    //Create a new player and add to the team
});

router.post('/removePlayer', function (req, res) {
    //Remove a player from the team and delete the player
});

module.exports = router;