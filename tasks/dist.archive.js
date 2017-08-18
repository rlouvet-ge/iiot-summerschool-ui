/**
 * Created by benoitlaurent on 04/11/16.
 */

"use strict";

// -----------------------------------------------------------------------------
// Task: Dist : archive dist/ folder
// -----------------------------------------------------------------------------

const zip = require("gulp-zip");

module.exports = function (gulp) {
    return function () {
        const appName = process.env.ci_build_appname;
        const tag = process.env.ci_build_tag + "-" + process.env.ci_build_number + "-" + process.env.ci_build_mode;

        return gulp.src("dist/**")
            .pipe(zip(appName + "-" + tag + ".zip"))
            .pipe(gulp.dest("./"));
    };
};
