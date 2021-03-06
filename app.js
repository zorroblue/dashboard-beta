/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const expressValidator = require('express-validator');
const expressStatusMonitor = require('express-status-monitor');
const sass = require('node-sass-middleware');
const multer = require('multer');

var fs = require('fs');
var mime = require('mime');
var PythonShell = require('python-shell');

const upload = multer({ dest: path.join(__dirname, 'uploads') });

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.load({ path: '.env.example' });

/**
 * Controllers (route handlers).
 */
const homeController = require('./controllers/home');
const userController = require('./controllers/user');
const apiController = require('./controllers/api');
const contactController = require('./controllers/contact');

const wikiController = require('./controllers/wiki');
const mfqpController = require('./controllers/mfqp');
const mcmpController = require('./controllers/mcmp');
const naaradController = require('./controllers/naarad');
const gyftController = require('./controllers/gyft');
const calendarController = require('./controllers/calendar');
const cabshareController = require('./controllers/cabshare');
const driverstatController = require('./controllers/driverstat');
const buysellController = require('./controllers/buysell');
const lostfoundController = require('./controllers/lostfound');
const coursesController = require('./controllers/courses');

const apisController = require('./controllers/apis');

/**
 * API keys and Passport configuration.
 */
const passportConfig = require('./config/passport');

/**
 * Create Express server.
 */
const app = express();

/**
 * Connect to MongoDB.
 */
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI);
mongoose.connection.on('error', (err) => {
    console.error(err);
    console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
    process.exit();
});

/**
 * Express configuration.
 */
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(expressStatusMonitor());
app.use(compression());
app.use(sass({
    src: path.join(__dirname, 'public'),
    dest: path.join(__dirname, 'public')
}));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    store: new MongoStore({
        url: process.env.MONGODB_URI || process.env.MONGOLAB_URI,
        autoReconnect: true,
        clear_interval: 3600
    })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
    if (req.path === '/api/upload') {
        next();
    } else {
        lusca.csrf()(req, res, next);
    }
});
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});
app.use((req, res, next) => {
    // After successful login, redirect back to the intended page
    if (!req.user &&
        req.path !== '/login' &&
        req.path !== '/signup' &&
        !req.path.match(/^\/auth/) &&
        !req.path.match(/\./)) {
        req.session.returnTo = req.path;
    } else if (req.user &&
        req.path == '/account') {
        req.session.returnTo = req.path;
    }
    next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));
app.use('/datepicker', express.static(__dirname + '/node_modules/angularjs-datepicker/dist/'));

/**
 * Primary app routes.
 */
app.get('/', homeController.index);
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
app.get('/reset/:token', userController.getReset);
app.post('/reset/:token', userController.postReset);
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);
app.get('/account', passportConfig.isAuthenticated, userController.getAccount);
app.post('/account/profile', passportConfig.isAuthenticated, userController.postUpdateProfile);
app.post('/account/password', passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post('/account/delete', passportConfig.isAuthenticated, userController.postDeleteAccount);
app.get('/account/unlink/:provider', passportConfig.isAuthenticated, userController.getOauthUnlink);

/**
 * Secondary app routes
 */
app.get('/wiki', wikiController.getWiki);
app.get('/mfqp', mfqpController.getMfqp);
app.get('/mcmp', mcmpController.getMcmp);
app.get('/naarad', naaradController.getNaarad);
app.get('/gyft', gyftController.getGyft);
app.get('/calendar', calendarController.getCalendar);
app.get('/cabshare', cabshareController.getCabShare);
app.get('/driverstat', driverstatController.getDriverStat);
app.get('/buysell', buysellController.getBuySell);
app.get('/lostfound', lostfoundController.getLostFound);
app.get('/courses', coursesController.getCourses);

app.get('/apis', apisController.getApis);

/**
 * API examples routes.
 */
app.get('/api', apiController.getApi);
app.get('/api/lastfm', apiController.getLastfm);
app.get('/api/nyt', apiController.getNewYorkTimes);
app.get('/api/aviary', apiController.getAviary);
app.get('/api/steam', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getSteam);
app.get('/api/stripe', apiController.getStripe);
app.post('/api/stripe', apiController.postStripe);
app.get('/api/scraping', apiController.getScraping);
app.get('/api/twilio', apiController.getTwilio);
app.post('/api/twilio', apiController.postTwilio);
app.get('/api/clockwork', apiController.getClockwork);
app.post('/api/clockwork', apiController.postClockwork);
app.get('/api/foursquare', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getFoursquare);
app.get('/api/tumblr', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getTumblr);
app.get('/api/facebook', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getFacebook);
app.get('/api/github', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getGithub);
app.get('/api/twitter', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getTwitter);
app.post('/api/twitter', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.postTwitter);
app.get('/api/linkedin', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getLinkedin);
app.get('/api/instagram', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getInstagram);
app.get('/api/paypal', apiController.getPayPal);
app.get('/api/paypal/success', apiController.getPayPalSuccess);
app.get('/api/paypal/cancel', apiController.getPayPalCancel);
app.get('/api/lob', apiController.getLob);
app.get('/api/upload', apiController.getFileUpload);
app.post('/api/upload', upload.single('myFile'), apiController.postFileUpload);
app.get('/api/pinterest', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getPinterest);
app.post('/api/pinterest', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.postPinterest);
app.get('/api/google-maps', apiController.getGoogleMaps);

/**
 * OAuth authentication routes. (Sign in)
 */
app.get('/auth/instagram', passport.authenticate('instagram'));
app.get('/auth/instagram/callback', passport.authenticate('instagram', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
});
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'public_profile'] }));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
});
app.get('/auth/github', passport.authenticate('github'));
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
});
app.get('/auth/google', passport.authenticate('google', { scope: 'profile email' }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
});
app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
});
app.get('/auth/linkedin', passport.authenticate('linkedin', { state: 'SOME STATE' }));
app.get('/auth/linkedin/callback', passport.authenticate('linkedin', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
});

/**
 * OAuth authorization routes. (API examples)
 */
app.get('/auth/foursquare', passport.authorize('foursquare'));
app.get('/auth/foursquare/callback', passport.authorize('foursquare', { failureRedirect: '/api' }), (req, res) => {
    res.redirect('/api/foursquare');
});
app.get('/auth/tumblr', passport.authorize('tumblr'));
app.get('/auth/tumblr/callback', passport.authorize('tumblr', { failureRedirect: '/api' }), (req, res) => {
    res.redirect('/api/tumblr');
});
app.get('/auth/steam', passport.authorize('openid', { state: 'SOME STATE' }));
app.get('/auth/steam/callback', passport.authorize('openid', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
});
app.get('/auth/pinterest', passport.authorize('pinterest', { scope: 'read_public write_public' }));
app.get('/auth/pinterest/callback', passport.authorize('pinterest', { failureRedirect: '/login' }), (req, res) => {
    res.redirect('/api/pinterest');
});

/**
 * Angular routes
 */
var makeICS = function(res, user, tempdir, scriptdir) {
    options = {
        mode: 'text',
        scriptPath: 'scripts/',
        args: [user, tempdir, scriptdir]
    };
    var pyshell = new PythonShell('generate_ics.py', options);
    pyshell.on('message', function(message) {
        console.log(message);
        res.send(message);
    });

    pyshell.end(function(err) {
        if (err) throw err;
        console.log('Generated ICS for ' + user);
    });
};

app.get('/api/getSecret/:user', function(req, res) {
    console.log("Received roll number: " + req.params.user);
    var options = {
        mode: 'text',
        scriptPath: 'scripts/',
        args: [req.params.user, path.resolve('tempstore/cookies/')]
    };
    var pyshell = new PythonShell('getSecurityQuestion.py', options);
    pyshell.on('message', function(message) {
        console.log(message);
        res.send(message);
    });

    pyshell.end(function(err) {
        if (err) throw err;
        console.log('Got security question');
    });
});

app.get('/api/makeTimeTable/:user/:pass/:secret/:sessionid', function(req, res) {
    console.log("Received credentials");
    var options = {
        mode: 'text',
        scriptPath: 'scripts/',
        args: [req.params.user, req.params.pass, req.params.secret, req.params.sessionid, path.resolve('tempstore/')]
    };
    var pyshell = new PythonShell('getTimetable.py', options);
    pyshell.on('message', function(message) {
        console.log(message);
        res.send(message);
    });

    pyshell.end(function(err) {
        if (err) throw err;
        console.log('Got timetable');
        makeICS(res, req.params.user, path.resolve('tempstore/'), path.resolve('scripts/'));
    });
});

app.get('/api/downloadICS/:user', function(req, res) {
    console.log("Begin download");
    var tt = path.resolve('tempstore/timetables/' + req.params.user + '.ics');
    var mimetype = mime.lookup(tt);

    res.setHeader('Content-disposition', 'attachment; filename=' + req.params.user + path.extname(tt));
    res.setHeader('Content-type', mimetype);

    var filestream = fs.createReadStream(tt);
    filestream.pipe(res);
    res.on('finish', function() {
        console.log("Download complete");
    });
});

app.get('/api/getTimetableHtml/:user', function(req, res) {
    console.log("Get Timetable HTML for " + req.params.user);
    var tt = path.resolve('tempstore/html/' + req.params.user + '.html');
    var mimetype = mime.lookup(tt);

    res.setHeader('Content-disposition', 'attachment; filename=' + req.params.user + path.extname(tt));
    res.setHeader('Content-type', mimetype);

    var filestream = fs.createReadStream(tt);
    filestream.pipe(res);
    res.on('finish', function() {
        console.log("Fetch HTML complete");
    });
});

/**
 * Error Handler.
 */
app.use(errorHandler());

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
    console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env')); 
    console.log('  Press CTRL-C to stop\n');
});

module.exports = app;
