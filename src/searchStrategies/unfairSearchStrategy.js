const { fairnessTreshold } = require("../config/config");

class UnfairSearchStrategy {
    handle(items) {
        const filtered = items.filter((item) => {
            const winPercent = item.winPercent;
            const normalizedTreshold = fairnessTreshold > 50 ? 100 - fairnessTreshold : fairnessTreshold;
            const normalizedWinPercent = winPercent > 50 ? 100 - winPercent : winPercent;
            return normalizedWinPercent <= normalizedTreshold;
        });

        // filtered.forEach((item) => {
        //     item.winPercent = 'hidden';
        // });

        // return filtered.sort(() => Math.random() - 0.5);
        return items.sort((a, b) => b.winPercent - a.winPercent);
    }
}

module.exports = new UnfairSearchStrategy();