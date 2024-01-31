const https = require('https');
const fs = require("fs");
const path = require("path");

const hero = 'oda-nobunaga';
const filename = 'odaNobunaga';
const url = 'https://unmatched.cards/api/db/decks/' + hero;

https.get(url, (response) => {
    let data = '';

    response.on('data', (chunk) => {
        data += chunk;
    });

    response.on('end', () => {
        const jsonData = JSON.parse(data);
        const cards = jsonData.cards;

        const sortedCards = cards.sort((a, b) => {
            const typeOrder = ['attack', 'defense', 'versatile', 'scheme'];
            return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
        });

        const extractedCards = sortedCards.map(card => ({
            title: card.title,
            type: card.type,
            quantity: card.quantity,
            boost: card.boost,
            value: card.value,
            characterName: card.characterName
        }));

        const deckFilePath = path.join(
            __dirname,
            "..",
            "config",
            "decks",
            `${filename}.json`
        );

        fs.writeFile(deckFilePath, JSON.stringify(extractedCards), err => {
            if (err) {
                console.error(err);
            }
        });
    });

}).on('error', (error) => {
    console.error('Error:', error);
});
