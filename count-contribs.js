const axios = require('axios');


// load environmental variables from .env file
require('dotenv').config();
const orgName = process.env.ORG_NAME;
const token = process.env.TOKEN;
const startDays = process.env.START_DAYS;

async function getAllContributorsForOrg() {
  try {
    // Get the list of repositories in the organization
    const reposResponse = await axios.get(`https://api.github.com/orgs/${orgName}/repos`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json"
      },
    });

    const contributorsSet = new Set();

    for (const repo of reposResponse.data) {
      let page = 1;
      let hasNextPage = true;

      while (hasNextPage) {
        // Get the events for each repository
        const eventsResponse = await axios.get(`https://api.github.com/repos/${orgName}/${repo.name}/events`, {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github+json"
          },
          params: {
            per_page: 100,
            page
          },
        });

        // Filter events by contributor activity in the last 90 days and type "PushEvent"
        const recentContributors = eventsResponse.data
          .filter(event => {
            return event.type === "PushEvent" &&
              event.actor && event.created_at &&
              new Date(event.created_at) > new Date(new Date() - startDays * 24 * 60 * 60 * 1000);
          })
          .map(event => event.actor.login);

        // Add recent contributors to the set
        recentContributors.forEach(contributor => {
          contributorsSet.add(contributor);
        });

        const linkHeader = eventsResponse.headers.link;
        if (linkHeader) {
          // Check if there's a "next" page link
          hasNextPage = /rel="next"/.test(linkHeader);
        } else {
          hasNextPage = false;
        }

        // Increment the page number
        page++;
      }
    }

    // Convert the set to an array of contributors
    const contributorsArray = Array.from(contributorsSet);

    console.log(`\nContributors in the last ${startDays} days:`, contributorsArray);
    console.log('\nTotal number of contributors:', contributorsArray.length);
    return contributorsArray;

  } catch (error) {
    console.error(error)
    console.error('Error:', error.message);
    return error;
  }
}

module.exports = {
  getAllContributorsForOrg
}
