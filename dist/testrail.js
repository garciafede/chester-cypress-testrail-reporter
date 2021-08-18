"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var axios = require('axios');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var glob = require("glob");
var FormData = require('form-data');
var testrail_interface_1 = require("./testrail.interface");
var moment = require("moment");
var TestRail = /** @class */ (function () {
    function TestRail(options) {
        this.options = options;
        this.base = "https://" + options.domain + "/index.php?/api/v2";
    }    
    TestRail.prototype.isRunToday = function () {
        var _this = this;
        return axios({
            method: 'get',
            url: this.base + "/get_runs/" + this.options.projectId,
            headers: { 'Content-Type': 'application/json' },
            auth: {
                username: this.options.username,
                password: this.options.password,
            }
        }).then(function (response) {
            _this.lastRunDate = response.data[0].description;
            // set current date with same format as this.lastRunDate
            _this.currentDate = moment(new Date()).format('L');
            if (_this.lastRunDate === _this.currentDate) {
                console.log("Test Run already created today. posting results to Test Run ID: R" + response.data[0].id);
                return true;
            }
            return false;
        });
        // .catch(error => console.error(error));
    };
    TestRail.prototype.createRun = function (name, description) {
        var _this = this;
        // If the lastRunDate of the most current test run is equal to today's date, don't create a new test run.
        axios({
            method: 'post',
            url: this.base + "/add_run/" + this.options.projectId,
            headers: { 'Content-Type': 'application/json' },
            auth: {
                username: this.options.username,
                password: this.options.password,
            },
            data: JSON.stringify({
                suite_id: this.options.suiteId,
                name: name,
                description: description,
                include_all: true,
            }),
        })
            .then(function (response) {
            console.log('Creating test run... ---> run id is:  ', response.data.id);
            _this.runId = response.data.id;
        });
        // .catch(error => console.(error));
    };
    TestRail.prototype.publishResults = function (results) {
        var _this = this;
        if (!this.options.createTestRun) {
            this.runId = this.options.runId;
        }
        axios({
            method: 'get',
            url: this.base + "/get_runs/" + this.options.projectId,
            headers: { 'Content-Type': 'application/json' },
            auth: {
                username: this.options.username,
                password: this.options.password,
            }
        })
            .then(function (response) {
            _this.runId = response.data[0].id;
            publishToAPI();
        });
        var publishToAPI = function () {
            axios({
                method: 'post',
                url: _this.base + "/add_results_for_cases/" + _this.runId,
                headers: { 'Content-Type': 'application/json' },
                auth: {
                    username: _this.options.username,
                    password: _this.options.password,
                },
                data: JSON.stringify({ results: results }),
            })
                .then(function (response) {
                console.log('\n', chalk.magenta.underline.bold('(TestRail Reporter)'));
                console.log('\n', " - Results are published to " + chalk.magenta("https://" + _this.options.domain + "/index.php?/runs/view/" + _this.runId), '\n');
                let count = 0;
                results.forEach(result => {                    
                    if (result.status_id === testrail_interface_1.Status.Failed)
                    {
                    _this.uploadScreenshots(result.case_id, response.data[count].id);
                    }
                    count++;
                });
            })
                .catch(function (error) { return console.error(error); });
        };
    };
    TestRail.prototype.uploadAttachment = function (resultId, path) {
        var _this = this;
        var form = new FormData();
        form.append('attachment', fs.createReadStream(path));
        axios({
            method: 'post',
            url: _this.base + "/add_attachment_to_result/" + resultId,
            headers: __assign({}, form.getHeaders()),
            auth: {
                username: _this.options.username,
                password: _this.options.password,
            },
            data: form,
        });
    };
    TestRail.prototype.uploadScreenshots = function (caseId, resultId) {
        var _this = this;
        var SCREENSHOTS_FOLDER_PATH = path.join(__dirname, '../../../cypress/screenshots');
        getDirectories(SCREENSHOTS_FOLDER_PATH, function (err, files) {
            if (err) {
                return console.log('Unable to scan screenshots folder: ' + err);
            } else {
            files.forEach(function (file) {
                if (file.includes("C" + caseId) && /(failed|attempt)/g.test(file)) {
                    try {
                        _this.uploadAttachment(resultId, file);
                    }
                    catch (err) {
                        console.log('Screenshot upload error: ', err);
                    }
                }
            });
        }
        });
    };
    var getDirectories = function (src, callback) {
        glob(src + '/**/*', callback);
      };
    return TestRail;
}());
exports.TestRail = TestRail;
//# sourceMappingURL=testrail.js.map