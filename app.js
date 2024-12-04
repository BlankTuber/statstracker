const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const config = require('./config');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const seoMiddleware = require('./seoMiddleware'); // Import the SEO middleware
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fsp = fs.promises;


const app = express();

mongoose.connect(config.mongoURI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit the process if the connection fails
    });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: './tmp/',
    safeFileNames: true,
    preserveExtension: true,
    abortOnLimit: true
}));

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(seoMiddleware); // Use the SEO middleware

const User = require('./models/User');
const Code = require('./models/Code');
const Team = require('./models/Team');

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(session({
    secret: config.sessionSecret || 'default-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: config.mongoURI,
        collectionName: 'sessions',
        ttl: 30 * 24 * 60 * 60
    }),
    cookie: {
        secure: config.nodeEnv === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

const transporter = nodemailer.createTransport({
    host: config.emailHost,
    port: config.emailPort,
    secure: config.nodeEnv === 'production',
    ...(config.nodeEnv === 'production' && {
        auth: {
            user: config.emailUser,
            pass: config.emailPassword
        }
    })
});

app.get('/', (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.redirect('/login');
    }
    
    res.render('index', {
        isLoggedIn: req.session.isLoggedIn,
        seo: req.seo,
        styleName: "home"
    });
});

app.get('/login', (req, res) => {
    if (req.session.isLoggedIn) {
        return res.redirect('/');
    }
    
    req.seo.title = "Login";
    res.render('login', {
        isLoggedIn: req.session.isLoggedIn,
        seo: req.seo,
        styleName: "login"
    });
});

app.post('/login/getCode', async (req, res) => {
    const { email } = req.body;
    
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Email not found in closed beta list' });
        }
    
        const code = crypto.randomInt(100000, 999999).toString();
        
        await Code.create({ user: user._id, code });
        
        await transporter.sendMail({
            from: `"${config.emailFromName}" <${config.emailFromAddress}>`,
            to: email,
            subject: "Your Verification Code",
            text: `Your verification code is: ${code}`,
            html: `<p>Your verification code is: <strong>${code}</strong></p>`
        });
        
        res.status(200).json({ message: 'Verification code sent successfully' });
    } catch (error) {
        console.error('Error in getCode:', error);
        res.status(500).json({ error: 'Failed to send verification code' });
    }
});

app.post('/login/verify', async (req, res) => {
    const { email, code } = req.body;
    
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }
    
        const storedCode = await Code.findOne({ user: user._id, code });
        if (storedCode) {
            req.session.isLoggedIn = true;
            req.session.userId = user._id;
            
            await Code.deleteOne({ _id: storedCode._id });
            
            res.status(200).json({ message: 'Authentication successful' });
        } else {
            res.status(400).json({ error: 'Invalid verification code' });
        }
    } catch (error) {
        console.error('Error in verify:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/login');
    });
});

app.get('/team', async (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.redirect('/login');
    }

    try {
        const team = await Team.findOne({ owner: req.session.userId })
        if (!team){
            return res.render('newTeam', {
                isLoggedIn: req.session.isLoggedIn,
                seo: req.seo,
                styleName: "newTeam",
            })
        } else {
            req.seo.title = "Team";

            res.render('team', {
                isLoggedIn: req.session.isLoggedIn,
                seo: req.seo,
                styleName: "team",
                team: team,
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve team information' });
    }
});

app.get('/newGame', (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.redirect('/login');
    }
    req.seo.title = 'New Game';

    res.render('newGame', {
        isLoggedIn: req.session.isLoggedIn,
        seo: req.seo,
        styleName: "newGame"
    });
});

app.post('/upload', async (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.status(401).send('Unauthorized: Please log in to upload files.');
    }

    let inputBuffer;
    let originalFilename;
    let tempFilePath;

    try {
        if (req.files && req.files.file) {
            // Handle file upload
            const uploadedFile = req.files.file;
            if (!uploadedFile.mimetype.startsWith('image/')) {
                return res.status(400).send('Only image files are allowed.');
            }
            inputBuffer = uploadedFile.data;
            originalFilename = uploadedFile.name;
            tempFilePath = uploadedFile.tempFilePath;
        } else if (req.body.url) {
            // Handle URL-based upload
            const response = await axios.get(req.body.url, { responseType: 'arraybuffer' });
            inputBuffer = Buffer.from(response.data, 'binary');
            originalFilename = path.basename(req.body.url);
        } else {
            return res.status(400).send('No file or URL provided.');
        }

        const uniqueFilename = `${uuidv4()}-${originalFilename}`;
        const outputPath = path.join(uploadsDir, uniqueFilename);

        // Process and save the image
        const image = sharp(inputBuffer);
        const metadata = await image.metadata();

        if (metadata.width > 800) {
            await image.resize({ width: 800 })
                .jpeg({ quality: 80 })
                .toFile(outputPath);
        } else {
            await image.jpeg({ quality: 80 })
                .toFile(outputPath);
        }

        // Delete the temporary file if it exists
        if (tempFilePath) {
            await fsp.unlink(tempFilePath);
        }

        // Delete previously uploaded file if it exists
        if (req.body.teamId) {
            const team = await Team.findById(req.body.teamId);
            if (team && team.logo) {
                const oldLogoPath = path.join(__dirname, 'public', team.logo);
                if (await fsp.access(oldLogoPath).then(() => true).catch(() => false)) {
                    await fsp.unlink(oldLogoPath);
                }
            }
        }

        res.status(201).json({ url: `./public/uploads/${uniqueFilename}` });
    } catch (error) {
        console.error('Error processing the image:', error);
        res.status(500).send('Error processing the image.');
    }
});

app.post('/newTeam', async (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.status(401).send('Unauthorized: Please log in to create a new team.');
    }

    try {
        const existingTeam = await Team.findOne({owner: req.session.userId});
        if (existingTeam) {
            return res.status(400).json({ error: 'You already have a team, and cannot create a new one right now.' });
        }

        const { name, logo } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Team name is required.' });
        }

        const newTeam = new Team({
            name,
            logo: logo || null, // Logo is optional
            owner: req.session.userId,
            games: [],
            players: []
        });

        await newTeam.save();

        res.status(201).json({
            message: 'Team created successfully',
            team: {
                id: newTeam._id,
                name: newTeam.name,
                logo: newTeam.logo
            }
        });
    } catch (error) {
        console.error('Error creating new team:', error);
        res.status(500).json({ error: 'An error occurred while creating the team.' });
    }
});

const axios = require('axios');
const cheerio = require('cheerio');

app.get('/api/search-logos', async (req, res) => {
    const query = req.query.query;
    try {
        const response = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`);
        const $ = cheerio.load(response.data);
        const images = $('img').map((i, el) => $(el).attr('src')).get();
        res.json(images.slice(1, 5));
    } catch (error) {
        console.error('Error searching for logos:', error);
        res.status(500).json({ error: 'Failed to search for logos' });
    }
});

const teamApi = require('./api/teamApi');

app.use('/api/teams/', teamApi);

// 404 Error Handler
app.use((req, res, next) => {
    res.status(404);
    res.render('error', {
        isLoggedIn: req.session.isLoggedIn,
        status: 404,
        message: 'Page Not Found',
        seo: { title: '404 - Page Not Found' },
        styleName: 'error'
    });
});

// General Error Handler
app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = 'Internal Server Error';

    console.error(err);

    res.status(status);
    res.render('error', {
        isLoggedIn: req.session.isLoggedIn,
        status: status,
        message: message,
        seo: { title: `${status} - ${message}` },
        styleName: 'error'
    });
});

const PORT = config.port || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});