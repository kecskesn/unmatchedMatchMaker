function mergeStats(umleagueData, localData) {
    const mergedData = umleagueData.map((umleagueItem) => {
        const localItem = localData.find((localItem) => localItem.hero === umleagueItem.hero);
        if (localItem) {
            return {
                hero: umleagueItem.hero,
                plays: umleagueItem.plays + localItem.plays,
                wins: umleagueItem.wins + localItem.wins,
                losses: umleagueItem.losses + localItem.losses,
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