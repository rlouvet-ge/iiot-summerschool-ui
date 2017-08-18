"use strict";

const merge = require("merge-stream");

// ------------------------------------------------
//   Task: Copy all deployment files to Dist folder
// ------------------------------------------------

module.exports = function (gulp) {
    return function () {
        const publicFiles = gulp.src(["public/**/*.*"]).pipe(gulp.dest("./dist/public"));
        const server = gulp.src(["server/**/*.*"]).pipe(gulp.dest("./dist/server"));
        const packageFile = gulp.src(["package.json"]).pipe(gulp.dest("dist"));

        return merge(publicFiles, server, packageFile);
    };
};
