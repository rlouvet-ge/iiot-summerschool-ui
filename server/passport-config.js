/*
 This module setups the Passport strategy for Predix
 */

"use strict";

const request = require("request");
const passport = require("passport");
const moment = require("moment");
const CloudFoundryStrategy = require("passport-predix-oauth").Strategy;
const config = require("./server-config").getServerConfig();
let cfStrategy;

const HTTP_UNAUTHORIZED = 401;

function addTokenProp(obj, accessToken, refreshToken, expiresIn) {
    const result = obj || {};
    const tokens = {
        accessToken: accessToken,
        refreshToken: refreshToken
    };

    if (expiresIn) {
        tokens.expires = moment().add(expiresIn, "seconds").unix(); // eslint-disable-line newline-per-chained-call
    }

    result[config.tokensProp] = tokens;

    return result;
}

function configurePassportStrategy() {
    // Passport session setup.
    //   To support persistent login sessions, Passport needs to be able to
    //   serialize users into and deserialize users out of the session.  Typically,
    //   this will be as simple as storing the user ID when serializing, and finding
    //   the user by ID when deserializing.  However, since this example does not
    //   have a database of user records, the complete CloudFoundry profile is
    //   serialized and deserialized.
    passport.serializeUser(function (user, done) {
        done(null, user);
    });
    passport.deserializeUser(function (obj, done) {
        done(null, obj);
    });

    cfStrategy = new CloudFoundryStrategy({
        clientID: config.clientId,
        clientSecret: config.clientSecret,
        callbackURL: config.callbackURL,
        uaaURL: config.uaaURL,
        // Set skipUserProfile to false if you need user info AND have the openid scope
        skipUserProfile: true
    }, function (accessToken, refreshToken, params, profile, done) {
        const user = addTokenProp(profile, accessToken, refreshToken, params.expires_in);

        done(null, user);
    });

    // Add a way to get user profile to predix strategy
    cfStrategy.userProfile = function (accessToken, done) {
        request({
            method: "GET",
            url: cfStrategy._userProfileURI,
            auth: {
                bearer: accessToken
            }
        }, function (err, response, body) {
            if (err) {
                done(err);
            } else {
                try {
                    done(null, JSON.parse(body));
                } catch (ex) {
                    done(ex);
                }
            }
        });

    };

    passport.use(cfStrategy);

    return passport;
}

function authenticate(options) {
    return function (req, res, next) {
        let tokens;

        function success() {
            next();
        }

        function fail() {
            if (options && options.noRedirect) {
                res.sendStatus(HTTP_UNAUTHORIZED);
            } else {
                req.session[config.callbackProp] = req.baseUrl + req.path;
                res.redirect(config.loginURL);
            }
        }

        function renewToken(refreshToken) {
            cfStrategy._oauth2.getOAuthAccessToken(
                refreshToken,
                {
                    grant_type: "refresh_token" // eslint-disable-line camelcase
                },
                function (err, newAccessToken, newRefreshToken, params) {
                    if (newAccessToken && newRefreshToken) {
                        addTokenProp(req.user, newAccessToken, newRefreshToken, params.expires_in);
                        success();
                    } else {
                        fail();
                    }
                });
        }

        if (req.isAuthenticated()) {
            tokens = req.user[config.tokensProp];

            if (tokens.expires &&
                moment.unix(tokens.expires)
                    .isAfter(moment().add(config.refreshWindow, "seconds"))) {
                success();
            } else {
                renewToken(tokens.refreshToken);
            }
        } else {
            fail();
        }
    };
}

module.exports = {
    configurePassportStrategy: configurePassportStrategy,
    authenticate: authenticate
};
