/**
 * Created by benoitlaurent on 14/11/16.
 */

"use strict";

// -----------------------------------------------------------------------------
// Task: get credentials for Artifactory
// -----------------------------------------------------------------------------

const request = require("request");
const fs = require("fs");
const options = {
    url: "https://github.build.ge.com/api/v3/repos/GE-Digital-Foundry-Europe/credentials/contents/credentials.json",
    headers: {
        Authorization: "token 06257b3aa41c2d6c92d69adf643dc7b650fd1bbd",
        Accept: "application/vnd.github.v3.raw"
    }
};

module.exports = function () {
    return function () {
        return request(options)
            .pipe(fs.createWriteStream("credentials.json"));
    };
};

