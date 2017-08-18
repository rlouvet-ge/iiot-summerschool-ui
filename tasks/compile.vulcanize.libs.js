"use strict";

// -------------------------------------------
//   Task: Compile: Vulcanize ge-app element
// -------------------------------------------

const vulcanize = require("gulp-vulcanize");
const htmlMinifier = require("gulp-html-minifier");

module.exports = function (gulp) {
    return function () {
        return gulp.src([
            "public/bower_components/polymer/polymer.html"
        ], {base: "public/"})
            .pipe(vulcanize({
                abspath: "",
                excludes: [],
                inlineCSS: true,
                inlineScripts: true
            }))
            .pipe(htmlMinifier({
                removeComments: true,
                minifyJS: true,
                collapseWhitespace: true
            }))
            .pipe(gulp.dest("dist/public/"));
    };
};
