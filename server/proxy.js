/**
 * This module can be used to set up reverse proxying from client to Predix services or custom backend microservices.
 */

"use strict";

const url = require("url");
const express = require("express");
const moment = require("moment");
const expressProxy = require("express-http-proxy");
const HttpsProxyAgent = require("https-proxy-agent");
const request = require("request");
const serverConfig = require("./server-config");
const config = serverConfig.getServerConfig();
const router = express.Router(); // eslint-disable-line new-cap

const corporateProxyServer =
    process.env.http_proxy || process.env.HTTP_PROXY ||
    process.env.https_proxy || process.env.HTTPS_PROXY;

let corporateProxyAgent;

// Constants
const HTTP_FORBIDDEN_STATUS = 403;
const HTTP_OK_STATUS = 200;

// Corporate proxy
if (corporateProxyServer) {
    corporateProxyAgent = new HttpsProxyAgent(corporateProxyServer);
}

/* ********* Define Services Routes ********* */

function cleanResponseHeaders(rsp, data, req, res, cb) {
    res.removeHeader("Access-Control-Allow-Origin");
    cb(null, data);
}

function buildDecorator(headers) {
    return function (req) {
        if (corporateProxyAgent) {
            req.agent = corporateProxyAgent;
        }
        req.headers["Content-Type"] = "application/json";

        if (headers) {
            headers.forEach(function (header) {
                req.headers[header[0]] = header[1];
            });
        }
        return req;
    };
}

function buildPathCalculator(endpoint) {
    return function (req) {
        let proxyPath = url.parse(endpoint).path;
        let reqPath = url.parse(req.url).path;

        // Build a new path with partial path from proxy endpoint and partial path from req
        if (proxyPath.endsWith("/")) {
            proxyPath = proxyPath.substring(0, proxyPath.length - 1);
        }
        if (reqPath.startsWith("/")) {
            reqPath = reqPath.substring(1, reqPath.length);
        }
        return proxyPath + "/" + reqPath;
    };
}


/* ********* Add Token Middleware ********* */

function getBase64Credential(clientId, clientSecret) {
    return new Buffer(clientId + ":" + clientSecret).toString("base64");
}

function getClientToken(successCallback, errorCallback) {
    const options = {
        method: "POST",
        url: config.uaaURL + "/oauth/token",
        form: {
            grant_type: "client_credentials", // eslint-disable-line camelcase
            client_id: config.clientId // eslint-disable-line camelcase
        },
        headers: {
            Authorization: "Basic " + getBase64Credential(config.clientId, config.clientSecret)
        }
    };

    request(options, function (err, response, body) {
        let clientTokenResponse = {};

        if (!err && response.statusCode === HTTP_OK_STATUS) {
            // Debug console.log("response from getClientToken: " + body);
            clientTokenResponse = JSON.parse(body);
            successCallback(clientTokenResponse);
        } else if (errorCallback) {
            errorCallback(body);
        } else {
            console.log("ERROR fetching client token: " + body);
        }
    });
}

function getCupsClientToken(successCallback, errorCallback) {
    const options = {
        method: "POST",
        url: config.proxy.utum_uaa_admin.uaaUri + "/oauth/token",
        form: {
            grant_type: "client_credentials", // eslint-disable-line camelcase
            client_id: config.proxy.utum_uaa_admin.clientId // eslint-disable-line camelcase
        },
        headers: {
            Authorization: "Basic " + getBase64Credential(config.proxy.utum_uaa_admin.clientId,
                config.proxy.utum_uaa_admin.clientSecret)
        }
    };

    request(options, function (err, response, body) {
        let clientTokenResponse = {};

        if (!err && response.statusCode === HTTP_OK_STATUS) {
            // Debug console.log("response from getClientToken: " + body);
            clientTokenResponse = JSON.parse(body);
            successCallback(clientTokenResponse);
        } else if (errorCallback) {
            errorCallback(body);
        } else {
            console.log("ERROR fetching client token: " + body);
        }
    });
}

// Fetches client token, adds to request headers, and stores in session.
// Returns 403 if no session.
// Use this middleware to proxy a request to a secure service, using a client token.
function addClientTokenMiddleware(req, res, next) {
    function errorHandler(errorString) {
        // TODO: fix, so it doesn't return a status 200.
        //  Tried sendStatus, but headers were already set.
        res.send(errorString);
    }

    // Debug console.log("proxy root route");
    if (req.session) {
        // Debug console.log("session found.");
        if (req.session.authorizationHeader &&
            moment.unix(req.session.clientTokenExpires).isAfter(moment().add(config.refreshWindow, "seconds"))) {
            // Debug ƒg("client token found in session");
            req.headers.Authorization = req.session.authorizationHeader;
            console.log("if (req.session.authorizationHeader " + req.session.authorizationHeader);
            next();
        } else {
            // Debug console.log("fetching client token");
            getClientToken(function (token) {
                req.session.authorizationHeader = token.token_type + " " + token.access_token;
                // eslint-disable-next-line newline-per-chained-call
                req.session.clientTokenExpires = moment().add(token.expires_in, "seconds").unix();
                req.headers.Authorization = req.session.authorizationHeader;
                // Debug console.log("else " + req.session.authorizationHeader);
                next();
            }, errorHandler);
        }
    } else {
        next(res.sendStatus(HTTP_FORBIDDEN_STATUS).send("Forbidden"));
    }
}

function addCupsClientTokenMiddleware(req, res, next) {
    function errorHandler(errorString) {
        // TODO: fix, so it doesn't return a status 200.
        //  Tried sendStatus, but headers were already set.
        res.send(errorString);
    }

    // Debug console.log("proxy root route");
    if (req.session) {
        // Debug console.log("session found.");
        if (req.session.cupsAuthorizationHeader &&
            moment.unix(req.session.cupsClientTokenExpires).isAfter(moment().add(config.refreshWindow, "seconds"))) {
            // Debug ƒg("client token found in session");
            req.headers.Authorization = req.session.cupsAuthorizationHeader;
            next();
        } else {
            // Debug console.log("fetching client token");
            getCupsClientToken(function (token) {
                req.session.cupsAuthorizationHeader = token.token_type + " " + token.access_token;
                // eslint-disable-next-line newline-per-chained-call
                req.session.cupsClientTokenExpires = moment().add(token.expires_in, "seconds").unix();
                req.headers.Authorization = req.session.cupsAuthorizationHeader;
                next();
            }, errorHandler);
        }
    } else {
        next(res.sendStatus(HTTP_FORBIDDEN_STATUS).send("Forbidden"));
    }
}

function setProxyRoute(key, serviceConfig) {
    let decorator;
    let pathCalculator;

    if (serviceConfig.endpoint) {
        console.log("setting proxy route for key: " + key);
        console.log("serviceEndpoint: " + serviceConfig.endpoint);

        decorator = buildDecorator(serviceConfig.headers);
        pathCalculator = buildPathCalculator(serviceConfig.endpoint);

        if (key.startsWith("utum")) {
            router.use("/" + key, addCupsClientTokenMiddleware);
        } else {
            router.use("/" + key, addClientTokenMiddleware);
        }
        router.use("/" + key, expressProxy(serviceConfig.endpoint, {
            intercept: cleanResponseHeaders,
            decorateRequest: decorator,
            forwardPath: pathCalculator
        }));
    } else {
        console.log("No endpoint found for service " + key);
    }
}

// Create routes for each Predix service registered in config.proxy
function setProxyRoutes() {
    Object.keys(config.proxy).forEach(function (key) {
        setProxyRoute(key, config.proxy[key]);
    });
}


// Create the predix service routes
setProxyRoutes();

module.exports = {
    router: router,
    addClientTokenMiddleware: addClientTokenMiddleware
};
