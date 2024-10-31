const dotenv = require('dotenv');

dotenv.config();

const defaultSeo = {
    title: 'Project Synedrius',
    description: 'A platform for syndicates to collaborate with wikis, forums, and chats.',
    author: 'Quidque Studio',
    keywords: 'syndicates, wiki, chat, forum, Project Synedrius',
    robots: 'index, follow',
    image: `${process.env.URL}/assets/images/favicon.ico`,
    url: process.env.URL,
    ogType: 'website',
    ogLocale: 'en_US',
    ogUrl: process.env.URL,
    ogImage: `${process.env.URL}/assets/images/favicon.ico`,
};

const seoMiddleware = (req, res, next) => {
    req.seo = { ...defaultSeo };
    next();
};

module.exports = seoMiddleware;