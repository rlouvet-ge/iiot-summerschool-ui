/**
 * Created by benoitlaurent on 04/11/16.
 */

"use strict";

// -------------------------------------------
//   Task: Deploy: deploy zip to Artifactory
// -------------------------------------------


const artifactoryUpload = require("gulp-artifactory-upload");

module.exports = function (gulp) {
    return function () {
        const buildMode = process.env.ci_build_mode;
        let server = "https://devcloud.swcoe.ge.com/artifactory/IEWMR";

        if (buildMode === "SNAPSHOT") {
            server = server + "-SNAPSHOT";
        }
        const tag = process.env.ci_build_tag + "-" + process.env.ci_build_number + "-" + process.env.ci_build_mode;

        // Credentials.json is generated dynamically by the previous gulp task (deploy.credentials)
        const credential = require("../credentials.json"); // eslint-disable-line global-require

        const appName = process.env.ci_build_appname;

        return gulp.src(appName + "-" + tag + ".zip")
            .pipe(artifactoryUpload({
                url: server,
                username: credential.username,
                password: credential.password
            }));
    };
};
