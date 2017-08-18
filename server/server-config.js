/*
 * This module reads config settings from local-config.json when running locally,
 * or from the VCAPS environment variables when running in Cloud Foundry.
 */

"use strict";

const cfenv = require("cfenv");
const url = require("url");

let serverConfig = null;

const getCredentials = {
    "predix-uaa": function (config, credentials) {
        config.uaaURL = credentials.uri;
        config.clientId = process.env.clientId;
        config.clientSecret = process.env.clientSecret;
        config.tokensProp = "tokens";
        config.callbackProp = "callback";
        // The refreshWindow is in seconds
        config.refreshWindow = 10; // eslint-disable-line no-magic-numbers

        if (config.appURL) {
            config.loginURL = config.appURL + "/login";
            config.callbackURL = config.appURL + "/callback";
        } else {
            console.log("Uaa should be configured after the appURL was set");
        }
    },
    "predix-timeseries": function (config, credentials) {
        // The uri exposed in VCAP for timeseries contains the path to query datapoints
        const uri = url.parse(credentials.query.uri);

        config.proxy["predix-timeseries"] = {
            endpoint: uri.protocol + "//" + uri.host,
            headers: [
                [credentials.query["zone-http-header-name"], credentials.query["zone-http-header-value"]]
            ]
        };
    },
    utum_timeseries: function (config, credentials) { // eslint-disable-line camelcase
        // The uri exposed in VCAP for timeseries contains the path to query datapoints
        const uri = url.parse(credentials.query.uri);

        config.proxy.utum_timeseries = { // eslint-disable-line camelcase
            endpoint: uri.protocol + "//" + uri.host,
            headers: [
                [credentials.query["zone-http-header-name"], credentials.query["zone-http-header-value"]]
            ]
        };
    },
    utum_uaa_admin: function (config, credentials) { // eslint-disable-line camelcase
        config.proxy.utum_uaa_admin = { // eslint-disable-line camelcase
            uaaUri: credentials.uri,
            clientId: "timeseries_client",
            clientSecret: "secret"
        };
    }
};

function exportLocalConfig(nodeEnv) {
    let vcap = {};

    if (!process.env.VCAP_APPLICATION) {
        const localConfig = require("./local-config.json")[nodeEnv]; // eslint-disable-line global-require

        process.env.clientId = localConfig.clientId;
        process.env.clientSecret = localConfig.clientSecret;
        process.env.PORT = localConfig.serverPort;
        vcap = localConfig.vcap;
    }
    return vcap;
}

function setServerConfig() {
    const nodeEnv = process.env.node_env || "development";

    // Export environment variable if local env
    const vcap = exportLocalConfig(nodeEnv);

    serverConfig = {
        nodeEnv: nodeEnv,
        proxy: {}
    };

    // The getAppEnv method will only use the vcap parameter if running locally
    const env = cfenv.getAppEnv({vcap: vcap});

    // Application configuration
    serverConfig.appURL = env.url;
    serverConfig.port = env.port;

    // Services configuration
    const services = env.getServices();

    Object.keys(services).forEach(function (serviceName) {
        const service = services[serviceName];
        const getCurrentServiceCredentials = getCredentials[service.name] || getCredentials[service.label];

        if (getCurrentServiceCredentials) {
            getCurrentServiceCredentials(serverConfig, service.credentials);
        } else {
            console.log("There is no defined way to get credentials for service " + service.name);
        }
    });

    // Detect environment
    serverConfig.uaaIsConfigured = Boolean(serverConfig.uaaURL &&
        serverConfig.uaaURL.indexOf("https") === 0 &&
        serverConfig.clientId &&
        serverConfig.clientSecret);

    console.log("************" + nodeEnv + "******************");
    console.log("SERVER CONFIG:");
    console.log(JSON.stringify(serverConfig, null, "\t"));

    return serverConfig;
}

function getServerConfig() {
    if (serverConfig) {
        return serverConfig;
    }
    return setServerConfig();
}

function resetServerConfig() {
    serverConfig = null;
}

module.exports = {
    getServerConfig: getServerConfig,
    resetServerConfig: resetServerConfig
};
