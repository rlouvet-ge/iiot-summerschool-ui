"use strict";

// -------------------------------------
//   Task: Compile: Sass
// -------------------------------------
const stylemod = require("gulp-style-modules");
const autoprefixer = require("gulp-autoprefixer");
const importOnce = require("node-sass-import-once");
const cssmin = require("gulp-cssmin");
const sass = require("gulp-sass");
const path = require("path");

function getName(file) {
    return path.basename(file.path, path.extname(file.path));
}

function styleModuleDest(file) {
    return file.base;
}

module.exports = function (gulp) {
    return function () {

        return gulp.src([
            "./public/*.scss",
            "./public/views/*.scss",
            "./public/elements/*.scss",
            "./public/elements/**/*.scss"
        ])
            .pipe(sass({
                includePaths: "./public/bower_components/",
                importer: importOnce,
                importOnce: {
                    index: true,
                    bower: true
                }
            })
                .on("error", sass.logError))
            .pipe(autoprefixer())
            .pipe(cssmin())
            .pipe(stylemod({
                // All files will be named 'styles.html'
                filename: function (file) {
                    return getName(file) + "-styles";
                },
                // Use '-css' suffix instead of '-styles' for module ids
                moduleId: function (file) {
                    return getName(file) + "-css";
                }
            }))
            .pipe(gulp.dest(styleModuleDest));
    };
};
