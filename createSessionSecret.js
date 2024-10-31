const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Function to generate a session secret
function generateSessionSecret(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

// Specify the file to save the session secret
const secretFilePath = path.join(__dirname, 'session-secret.txt');

// Generate the session secret
const sessionSecret = generateSessionSecret();

// Write the session secret to a file
fs.writeFile(secretFilePath, sessionSecret, (err) => {
    if (err) {
        console.error('Error writing session secret to file:', err);
    } else {
        console.log(`Session secret generated and saved to ${secretFilePath}`);
    }
});
