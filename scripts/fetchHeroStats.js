const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const heroes = require('../config/heroes.js');

puppeteer.use(StealthPlugin());

function toCamelCase(str) {
    const symbolRemovedName = str.replace(/[^\w\s]/g, '');
    const finalName = symbolRemovedName.replace(/(?:^\w|[A-Z]|\b\w)/g, (match, index) => {
        return index === 0 ? match.toLowerCase() : match.toUpperCase();
    }).replace(/\s+/g, '');
    return finalName;
}

async function fetchHeroData(page, hero) {
    const url = `https://www.umleague.net/api/analytics/getHeroResultsByMap?hero=${encodeURIComponent(hero)}&campaignid=10000&organizerid=0`;

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        const content = await page.evaluate(() => {
            return document.body.innerText;
        });
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error fetching data for hero ${hero}:`, error.message);
        return null;
    }
}

async function fetchAllHeroData() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    const dirPath = path.join(__dirname, '..', 'config', 'heroStats');

    try {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Directory created: ${dirPath}`);
    } catch (error) {
        console.error(`Error creating directory: ${error.message}`);
    }

    for (const hero of heroes) {
        const data = await fetchHeroData(page, hero);
        if (data) {
            const heroFileName = `${toCamelCase(hero)}.json`;
            const filePath = path.join(dirPath, heroFileName);

            console.log(`Attempting to save data to: ${filePath}`);

            try {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                console.log(`Hero data for ${hero} saved to ${filePath}`);
            } catch (error) {
                console.error(`Error writing file for ${hero}: ${error.message}`);
            }
        }
    }

    await browser.close();
}

fetchAllHeroData();
