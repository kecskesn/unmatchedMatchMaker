const heroes = require("../../../config/heroes");

class ExcludeUnfairSearchStrategy {
    handle(items, fairnessThreshold) {
        const unfairMatchups = items.filter((item) => {
            const normalizedThreshold = fairnessThreshold > 50 ? 100 - fairnessThreshold : fairnessThreshold;
            const normalizedWinPercent = item.winPercent > 50 ? 100 - item.winPercent : item.winPercent;
            return normalizedWinPercent <= normalizedThreshold;
        });

        let fairMatchups = items.filter((item) => {
            const normalizedThreshold = fairnessThreshold > 50 ? 100 - fairnessThreshold : fairnessThreshold;
            const normalizedWinPercent = item.winPercent > 50 ? 100 - item.winPercent : item.winPercent;
            return normalizedWinPercent >= normalizedThreshold;
        });

        const heroesInUnfairMatchups = new Set(unfairMatchups.map((item) => item.hero));
        const heroesInFairMatchups = new Set(fairMatchups.map((item) => item.hero));

        const heroesNotInBoth = heroes
            .filter((hero) => !heroesInUnfairMatchups.has(hero) && !heroesInFairMatchups.has(hero))
            .map((hero) => ({
                hero: hero,
                plays: 0,
                winPercent: '-',
            }));

        const finalResult = [...fairMatchups, ...heroesNotInBoth];

        return finalResult.sort((a, b) => b.plays - a.plays);
    }
}

module.exports = new ExcludeUnfairSearchStrategy();