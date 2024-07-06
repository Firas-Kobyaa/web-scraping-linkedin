const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;

const baseURL = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';
const keywords = 'email+developer';

let linkedinJobs = [];
const maxRetries = 5;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to fetch jobs from a given page number
async function fetchJobs(pageNumber, retries = 0) {
    const url = `${baseURL}?keywords=${keywords}&location=United+States&geoId=103644278&trk=public_jobs_jobs-search-bar_search-submit&currentJobId=2931031787&position=1&pageNum=0&start=${pageNumber}`;

    console.log(`Fetching jobs from URL: ${url}`);

    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
        const jobs = $('li');

        jobs.each((index, element) => {
            const jobTitle = $(element).find('h3.base-search-card__title').text().trim();
            const company = $(element).find('h4.base-search-card__subtitle').text().trim();
            const jobLocation = $(element).find('span.job-search-card__location').text().trim();
            const link = $(element).find('a.base-card__full-link').attr('href');

            linkedinJobs.push({
                'Title': jobTitle,
                'Company': company,
                'Location': jobLocation,
                'Link': link,
            });
        });
    } catch (error) {
        if (error.response && error.response.status === 429) {
            console.warn(`Rate limit exceeded. Retrying page ${pageNumber}...`);
            if (retries < maxRetries) {
                await delay(1000 * Math.pow(2, retries)); // Exponential backoff
                await fetchJobs(pageNumber, retries + 1);
            } else {
                console.error(`Failed to fetch page ${pageNumber} after ${maxRetries} retries.`);
            }
        } else {
            console.error(`Error fetching jobs from page ${pageNumber}:`, error.message || error);
        }
    }
}

// Main function to iterate through pages and fetch jobs
async function main() {
    const pageNumbers = Array.from({ length: 40 }, (_, i) => i * 25); // 40 pages, with offsets 0, 25, 50, ..., 975

    console.log(`Fetching jobs from ${pageNumbers.length} pages...`);

    await Promise.all(pageNumbers.map(pageNumber => fetchJobs(pageNumber)));

    try {
        await fs.writeFile('./linkedInJobs.json', JSON.stringify(linkedinJobs, null, 2));
        console.log('Data has been written to linkedInJobs.json');
    } catch (error) {
        console.error('Error writing data to file:', error.message || error);
    }
}

// Start the process
main();
