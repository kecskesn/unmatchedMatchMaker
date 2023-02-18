const { fairnessTreshold } = require("../constants/config");

class FairSearchStrategy {
    handle(items) {
        const filtered = items.filter((item) => {
            const winPercent = item.winPercent;
            const normalizedTreshold = fairnessTreshold > 50 ? 100 - fairnessTreshold : fairnessTreshold;
            const normalizedWinPercent = winPercent > 50 ? 100 - winPercent : winPercent;
            return normalizedWinPercent >= normalizedTreshold;
        });

        filtered.forEach((item) => {
            item.winPercent = 'hidden';
        });

        return filtered.sort(() => Math.random() - 0.5);
    }
}

module.exports = new FairSearchStrategy();