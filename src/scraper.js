const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

chromium.setHeadlessMode = true;

// Optional: If you'd like to disable webgl, true is the default.
chromium.setGraphicsMode = false;


const scrape = async (browser) => {

    const page = await browser.newPage();

    // Go to the first page to parse the pagination
    await page.goto('https://humanebroward.com/all-pets/?type=DOG&pg=1');

    // Wait for the pagination container to load
    await page.waitForSelector('.pagination-container', { visible: true });

    // Get the total number of pages from the pagination container
    const totalPages = await page.$eval('.pagination-container', el => parseInt(el.getAttribute('data-max')));

    console.log(`Total pages to scrape: ${totalPages}`);

    let allPets = [];

    // Loop through all the pages
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const url = `https://humanebroward.com/all-pets/?type=DOG&pg=${pageNum}`;
        await page.goto(url);

        // Wait for the pets container to load
        await page.waitForSelector('#pets-container .pet-item-link', { visible: true });

        // Extract the information from each child on the current page
        const pets = await page.$$eval('#pets-container .pet-item-link', links => {
            return links.map(link => {
                const name = link.querySelector('.pet-name')?.innerText.trim() || 'N/A';
                const id = link.querySelector('.pet-detail:first-child')?.innerText.trim() || 'N/A';
                const breed = link.querySelector('.pet-detail:nth-child(2)')?.innerText.trim().toLowerCase() || 'N/A';
                const gender = link.querySelector('.pet-detail:nth-child(3)')?.innerText.trim() || 'N/A';
                const ageWeight = link.querySelector('.pet-detail:nth-child(4)')?.innerText.trim() || 'N/A';
                const color = link.querySelector('.pet-detail:nth-child(5)')?.innerText.trim() || 'N/A';
                const location = link.querySelector('.pet-detail:nth-child(6)')?.innerText.trim() || 'N/A';
                const imageUrl = link.querySelector('.image-media img')?.src || 'N/A';
                const detailsUrl = link.href || 'N/A';
                const breedDenyList = ["pit", "bull", "staffordshire", "german shepherd", "labrador"];
                // Filter out breeds in the blacklist
                if (breedDenyList.some(breedName => breed.includes(breedName))) {
                    return null; // Ignore this pet
                }
                return {
                    name,
                    id,
                    breed,
                    gender,
                    ageWeight,
                    color,
                    location,
                    imageUrl,
                    detailsUrl
                };
            }).filter(pet => pet !== null);
        });

        allPets = allPets.concat(pets);

        console.log(`Page ${pageNum} scraped, ${pets.length} pets found.`);
    }

    console.log(`Total pets found after filtering: ${allPets.length}`);
    console.log(allPets);

    await browser.close();
    return allPets;
};

exports.handler = async (event) => {
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3();
    const BUCKET_NAME = process.env.BUCKET_NAME;
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = (`0${date.getUTCMonth() + 1}`).slice(-2);
    const day = (`0${date.getUTCDate()}`).slice(-2);
    const key = `${year}/${month}/${day}/pets.json`;
    const browser = await puppeteer.launch({
        args: [...chromium.args, '--disable-web-security'],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: true,
        ignoreHTTPSErrors: true,
    });
    try {

        const pets = await scrape(browser);
        const params = {
            Bucket: BUCKET_NAME,
            Key: key,
            Body: JSON.stringify(pets),
            ContentType: "application/json"
        };

        await s3.putObject(params).promise();
        console.log(`Data stored in S3 at ${key}`);

    } catch (error) {
        console.error('Error scraping data:', error);
        throw error;
    } finally {
        await browser.close();
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'OK',
        }),
    };
};
