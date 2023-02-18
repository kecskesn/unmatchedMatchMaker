class NormalSearchStrategy {
    handle(items) {
        return items.sort((a, b) => b.winPercent - a.winPercent);
    }
}

module.exports = new NormalSearchStrategy();