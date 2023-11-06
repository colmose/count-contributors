const test = require('tape');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

require('dotenv').config();
const orgName = process.env.ORG_NAME;
const currentDate = new Date();

// Calculate the date 90 days ago
const eightyNineDaysAgo = new Date(currentDate);
eightyNineDaysAgo.setDate(currentDate.getDate() - 89);

// Calculate the date 91 days ago
const ninetyOneDaysAgo = new Date(currentDate);
ninetyOneDaysAgo.setDate(currentDate.getDate() - 91);

// Import the function to test
const { getAllContributorsForOrg } = require('./count-contribs.js');

test('getAllContributorsForOrg', (t) => {
  const mock = new MockAdapter(axios);

  t.test('# should return contributors in the last 90 days', async (assert) => {
    // Mock the organization's repository list response
    mock.onGet(`https://api.github.com/orgs/${orgName}/repos`).reply(200, [
        { name: 'repo1' },
        { name: 'repo2' },
      ]
    );

    // Mock the events for each repository
    mock.onGet(`https://api.github.com/repos/${orgName}/repo1/events`, { params: { page: 1, per_page: 100 }}).reply(200, [
        { type: 'PushEvent', actor: { login: 'user1' }, created_at: eightyNineDaysAgo.toISOString() },
        { type: 'ForkEvent', actor: { login: 'user2' }, created_at: eightyNineDaysAgo.toISOString() },
      ],
      {
        link: 'rel="next"'
      }
    );
    mock.onGet(`https://api.github.com/repos/${orgName}/repo1/events`, { params: { page: 2, per_page: 100 }}).reply(200, [
      { type: 'PushEvent', actor: { login: 'user3' }, created_at: eightyNineDaysAgo.toISOString() },
    ]);

    mock.onGet(`https://api.github.com/repos/${orgName}/repo2/events`).reply(200, [
      { type: 'PushEvent', actor: { login: 'user4' }, created_at: eightyNineDaysAgo.toISOString() },
      { type: 'PushEvent', actor: { login: 'user5' }, created_at: ninetyOneDaysAgo.toISOString() },
    ]);

    // Call the function and test its result
    const contributors = await getAllContributorsForOrg();

    // Assertions
    assert.deepEqual(contributors, ['user1', 'user3', 'user4'], 'Contributors match expected result');

    // End the test
    assert.end();
  });

  // Cleanup after the tests
  test.onFinish(() => {
    mock.restore();
  });
});
