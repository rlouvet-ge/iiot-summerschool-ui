"use strict";

// -------------------------------------------
//   Task: Lint all code
// -------------------------------------------

const eslint = require("gulp-eslint");

// Just requiring the module is enough
require("eslint-plugin-html");

module.exports = function (gulp) {
    return function () {
        return gulp.src([
            "public/elements/**/*.html",
            "public/_index.html",
            "!public/**/*-styles.html",
            "server/**/*.js",
            "test/**/*.js",
            "test/**/*.html",
            "wct.conf.js",
            "gulpfile.js",
            "tasks/*.js"
        ], {base: "./"})
            .pipe(eslint({
                plugins: ["html"]
            }))
            .pipe(eslint.format())
            .pipe(eslint.failAfterError());
    };
};
