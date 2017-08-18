"use strict";

// -------------------------------------
//   Task: Serve
// -------------------------------------
const nodemon = require("gulp-nodemon");
const util = require("gulp-util");

module.exports = function () {
    return function () {
        let nodeEnv;

        if (util.env.dev || util.env.development) {
            nodeEnv = "development";
        } else if (util.env.int || util.env.integration) {
            nodeEnv = "integration";
        } else {
            nodeEnv = "development";
            console.log("No local environment option, defaulting to " + nodeEnv);
        }

        nodemon({
            script: "server/app.js",
            env: {
                "base-dir": "/../public",
                node_env: nodeEnv // eslint-disable-line camelcase
            }
        })
            .on("restart", function () {
                console.log("app.js restarted");
            });
    };
};
