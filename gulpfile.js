"use strict";

const gulp = require("gulp");
const gulpSequence = require("gulp-sequence");


// -----------------------------------------------------------------------------
// GetTask() loads external gulp task script functions by filename
// -----------------------------------------------------------------------------
function getTask(task) {
    /* eslint-disable global-require */
    return require("./tasks/" + task)(gulp);
    /* eslint-enable global-require */
}

// -----------------------------------------------------------------------------
// Task: Compile : Scripts, Sass, EJS, All
// -----------------------------------------------------------------------------
gulp.task("compile:sass", getTask("compile.sass"));
gulp.task("compile:index", getTask("compile.index"));
gulp.task("compile:vulcanize:libs", getTask("compile.vulcanize.libs"));
gulp.task("compile:vulcanize", getTask("compile.vulcanize"));
gulp.task("lint", getTask("lint"));

// -----------------------------------------------------------------------------
// Task: Serve : Start
// -----------------------------------------------------------------------------
gulp.task("serve:dev:start", getTask("serve.dev.start"));
gulp.task("serve:dist:start", getTask("serve.dist.start"));

gulp.task("serve", function (done) {
    gulpSequence(
        "dist",
        "serve:dev:start",
        "watch:public"
    )(done);
});

gulp.task("serve:dist", function (done) {
    gulpSequence(
        "dist",
        "serve:dist:start",
        "watch:public"
    )(done);
});

// -----------------------------------------------------------------------------
// Task: Watch : Source, Public, All
// -----------------------------------------------------------------------------
gulp.task("watch:public", getTask("watch.public"));

// -----------------------------------------------------------------------------
// Task: Dist : Clean 'dist/'' folder
// -----------------------------------------------------------------------------
gulp.task("dist:clean", getTask("dist.clean"));

// -----------------------------------------------------------------------------
// Task: Dist : Copy source files for deploy to dist/
// -----------------------------------------------------------------------------
gulp.task("dist:copy", getTask("dist.copy"));

// -----------------------------------------------------------------------------
// Task: Dist (Build app ready for deployment)
// -----------------------------------------------------------------------------
gulp.task("dist", function (done) {
    gulpSequence(
        "dist:clean",
        "compile:sass",
        "compile:index",
        // "lint",
        "dist:copy",
        "compile:vulcanize:libs",
        "compile:vulcanize"
    )(done);
});

// -----------------------------------------------------------------------------
// Task: Push to predix
// -----------------------------------------------------------------------------
gulp.task("push", ["dist"], getTask("push"));

// -----------------------------------------------------------------------------
// Task: Dist : archive dist/ folder
// -----------------------------------------------------------------------------
gulp.task("dist:archive", getTask("dist.archive"));

// -----------------------------------------------------------------------------
// Task: Deploy : deploy dist/ archive
// -----------------------------------------------------------------------------
gulp.task("deploy:artifactory", getTask("deploy.artifactory"));

// -----------------------------------------------------------------------------
// Task: Deploy : get credentials
// -----------------------------------------------------------------------------
gulp.task("deploy:credentials", getTask("deploy.credentials"));

// -----------------------------------------------------------------------------
// Task: Deploy (for jenkins)
// -----------------------------------------------------------------------------
gulp.task("deploy", function (cb) {
    gulpSequence(
        "dist",
        "dist:archive",
        "deploy:credentials",
        "deploy:artifactory"
    )(cb);
});

// -----------------------------------------------------------------------------
//  Task: Default (compile source, start server, watch for changes)
// -----------------------------------------------------------------------------
gulp.task("default", ["serve"]);
