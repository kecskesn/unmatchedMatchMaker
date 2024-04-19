class FairSearchStrategy {
    handle(items, fairnessThreshold) {
        const filtered = items.filter((item) => {
            const winPercent = item.winPercent;
            const normalizedTreshold = fairnessThreshold > 50 ? 100 - fairnessThreshold : fairnessThreshold;
            const normalizedWinPercent = winPercent > 50 ? 100 - winPercent : winPercent;
            return normalizedWinPercent >= normalizedTreshold;
        });

        return filtered.sort((a, b) => b.winPercent - a.winPercent);
    }
}

module.exports = new FairSearchStrategy();