const fairSearchStrategy = require("./fairSearchStrategy");
const normalSearchStrategy = require("./normalSearchStrategy");
const excludeUnfairSearchStrategy = require("./excludeUnfairSearchStrategy");

module.exports = {
    "normal": normalSearchStrategy,
    "fair": fairSearchStrategy,
    "excludeUnfair": excludeUnfairSearchStrategy
};