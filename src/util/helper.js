function mergeStats(umleagueData, localData) {
    const mergedData = umleagueData.map((umleagueItem) => {
        const localItem = localData.find((localItem) => localItem.hero === umleagueItem.hero);
        if (localItem) {
            return {
                hero: umleagueItem.hero,
                plays: umleagueItem.plays,
                wins: umleagueItem.wins,
                losses: umleagueItem.losses,
                combinedPlays: umleagueItem.plays + localItem.plays,
                combinedWins: umleagueItem.wins + localItem.wins,
                combinedLosses: umleagueItem.losses + localItem.losses,
            };
        } else {
            return umleagueItem;
        }
    });

    localData.forEach((localItem) => {
        if (!umleagueData.find((umleagueItem) => umleagueItem.hero === localItem.hero)) {
            mergedData.push(localItem);
        }
    });

    return mergedData;
}

module.exports = {
    mergeStats,
}