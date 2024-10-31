const dotenv = require('dotenv');

dotenv.config();

const defaultSeo = {
    title: 'Statstracker',
    description: 'Track sports\' game statistics.',
    author: 'Quidque Studio',
    keywords: 'statstracker',
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