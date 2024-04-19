class NormalSearchStrategy {
    handle(items, fairnessThreshold) {
        return items.sort((a, b) => b.winPercent - a.winPercent);
    }
}

module.exports = new NormalSearchStrategy();