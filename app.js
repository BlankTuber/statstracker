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
    secure: 'false',
    auth: {
        user: config.emailUser,
        pass: config.emailPassword
    }
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


app.post('/upload', async (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.status(401).send('Unauthorized: Please log in to upload files.');
    }

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

const PORT = config.port || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});