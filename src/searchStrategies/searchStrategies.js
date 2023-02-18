const fairSearchStrategy = require("./fairSearchStrategy");
const normalSearchStrategy = require("./normalSearchStrategy");
const unfairSearchStrategy = require("./unfairSearchStrategy");

module.exports = {
    "normal": normalSearchStrategy,
    "fair": fairSearchStrategy,
    "unfair": unfairSearchStrategy
};