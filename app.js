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

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.post('/upload', async (req, res) => {
    const { files } = req;

    if (!files || Object.keys(files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    const uploadedFile = files.file;

    if (!uploadedFile.mimetype.startsWith('image/')) {
        return res.status(400).send('Only image files are allowed.');
    }

    if (!uploadedFile.tempFilePath) {
        return res.status(400).send('Temporary file path not found.');
    }

    const uniqueFilename = `${uuidv4()}-${uploadedFile.name}`;

    try {
        const image = sharp(uploadedFile.tempFilePath);
        const metadata = await image.metadata();

        if (metadata.width > 800) {
            await image.resize({ width: 800 })
                .jpeg({ quality: 80 })
                .toFile(path.join(uploadsDir, uniqueFilename));
        } else {
            await image.jpeg({ quality: 80 })
                .toFile(path.join(uploadsDir, uniqueFilename));
        }

        res.status(201).send(`File uploaded and compressed to ${uploadsDir}/${uniqueFilename}`);
    } catch (error) {
        console.error('Error processing the image:', error);
        res.status(500).send('Error processing the image.');
    }
});

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

let isLoggedIn = false;

app.get('/', (req, res) => {
    if (!isLoggedIn) {
        return res.redirect('/login');
    }
    res.render('index', {
        isLoggedIn,
        seo: req.seo, // Pass SEO data to the view
        styleName: "home"
    });
});

app.get('/login', (req, res) => {
    if (isLoggedIn) {
        return res.redirect('/');
    }
    req.seo.title = "Login";
    res.render('login', {
        isLoggedIn,
        seo: req.seo, // Pass SEO data to the view
        styleName: "login"
    });
});

const PORT = config.port || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});