"use strict";

// -------------------------------------------
//   Task: Lint all code
// -------------------------------------------
const spawn = require("child_process").spawn;
const util = require("gulp-util");

module.exports = function () {
    return function (done) {
        let push;

        if (util.env.dev || util.env.development) {
            push = spawn("cf", ["push", "-f", "manifest-dev.yml"]);
        } else if (util.env.int || util.env.integration) {
            push = spawn("cf", ["push", "-f", "manifest-int.yml"]);
        } else {
            push = spawn("cf", ["push"]);
        }

        push.stdout.on("data", data => {
            util.log(data.toString());
        });

        push.stderr.on("data", data => {
            util.log(data.toString());
        });

        push.on("close", code => {
            util.log(`cf push exited with code ${code}`);
            done();
        });
    };
};
