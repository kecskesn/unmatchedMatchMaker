const https = require('https');
const fs = require("fs");
const path = require("path");

const hero = 'alice';
const url = 'https://unmatched.cards/api/db/decks/' + hero;

https.get(url, (response) => {
    let data = '';

    response.on('data', (chunk) => {
        data += chunk;
    });

    response.on('end', () => {
        const jsonData = JSON.parse(data);
        const cards = jsonData.cards;

        // Filter and sort cards by type
        const sortedCards = cards.sort((a, b) => {
            const typeOrder = ['attack', 'defense', 'versatile', 'scheme'];
            return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
        });

        // Extract title, type, and quantity fields
        const extractedCards = sortedCards.map(card => ({
            title: card.title,
            type: card.type,
            quantity: card.quantity
        }));

        const deckFilePath = path.join(
            __dirname,
            "..",
            "constants",
            "decks",
            `${hero}.json`
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
