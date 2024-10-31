require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    mongoURI: process.env.MONGO_URI,
    sessionSecret: process.env.SESSION_SECRET,
    novdeEnv: "development",
};
