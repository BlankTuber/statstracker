const mongoose = require('mongoose');
const config = require('./config');
const User = require('./models/User');

mongoose.connect(config.mongoURI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

async function createTempUser() {
    try {
        const tempUser = new User({
            email: 'bc.blankclips@gmail.com',
            username: 'TempUser',
            isVerified: false
        });

        await tempUser.save();
        console.log('Temporary user created successfully:', tempUser);
    } catch (error) {
        console.error('Error creating temporary user:', error);
    } finally {
        mongoose.connection.close();
    }
}

createTempUser();