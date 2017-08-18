"use strict";

const path = require("path");
const express = require("express");
// Used for session cookie
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
// Simple in-memory session is used here. use connect-redis for production!!
const session = require("express-session");
// Used to send gziped files
const compression = require("compression");
// Used when requesting data from real services.
const proxy = require("./proxy");
// Get config serverConfig from local file or VCAPS environment variable in the cloud
const serverConfig = require("./server-config");
// Configure passport for authentication with UAA
const passportConfig = require("./passport-config");
// Only used if you have configured properties for UAA
let passport;
let mainAuthenticate;

// Express server
const app = express();

// App configuration
const config = serverConfig.getServerConfig();


// Constants
const HTTP_INTERNAL_ERROR_STATUS = 500;


/**********************************************************************
 SETTING UP EXPRESS SERVER
 ***********************************************************************/

app.set("trust proxy", 1);
app.use(cookieParser("predixsample"));
app.use(compression());

app.use(session({
    secret: "predixsample",
    name: "cookie_name",
    proxy: true,
    resave: true,
    saveUninitialized: true
}));

if (config.uaaIsConfigured) {
    passport = passportConfig.configurePassportStrategy();
    app.use(passport.initialize());
    // Also use passport.session() middleware, to support persistent login sessions (recommended).
    app.use(passport.session());

    mainAuthenticate = function (options) {
        return passportConfig.authenticate(options);
    };
} else {
    mainAuthenticate = function () {
        return function (req, res, next) {
            next();
        };
    };
}

// Initializing application modules
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.listen(config.port, function () {
    console.log("Server is listening at: " + config.appURL);
});

/****************************************************************************
 SET UP EXPRESS ROUTES
 *****************************************************************************/

if (config.uaaIsConfigured) {
    // Login route redirect to predix uaa login page
    app.get("/login", passport.authenticate("predix", {scope: ""}));

    // Callback route redirects to secure route after login
    app.get("/callback", function (req, res, next) {
        const successRedirect = req.session[config.callbackProp] || "/";

        req.session[config.callbackProp] = null;
        passport.authenticate("predix", {
            successRedirect: successRedirect,
            failureRedirect: "/login"
        })(req, res, next);
    });

    // Logout route
    app.get("/logout", function (req, res) {
        req.session.destroy();
        req.logout();
        res.redirect(config.uaaURL + "/logout?redirect=" + config.appURL);
    });
}

// Secured route to access Predix services or backend microservices
app.use("/api", mainAuthenticate({noRedirect: true}), proxy.router);

// Route for direct calls to view
app.use("/view-*", mainAuthenticate(), function (req, res) {
    res.sendFile(process.cwd() + "/public/index.html");
});

// Use this route to make the entire app secure.  This forces login for any path in the entire app.
app.use("/", mainAuthenticate(),
    express.static(path.join(__dirname, process.env["base-dir"] ? process.env["base-dir"] : "../public"))
);


// //// error handlers //////

// Development error handler - prints stacktrace
if (config.nodeEnv !== "cloud") {
    app.use(function (err, req, res, next) {
        console.error(err.stack);
        if (res.headersSent) {
            return next(err);
        }
        res.status(err.status || HTTP_INTERNAL_ERROR_STATUS);
        return res.send({
            message: err.message,
            error: err
        });
    });
}

// Production error handler
// No stacktraces leaked to user
app.use(function (err, req, res, next) { // eslint-disable-line no-unused-vars
    if (!res.headersSent) {
        res.status(err.status || HTTP_INTERNAL_ERROR_STATUS);
        res.send({
            message: err.message,
            error: {}
        });
    }
});

module.exports = app;
