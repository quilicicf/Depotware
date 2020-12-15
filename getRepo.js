const axios = require('axios');

const { GITHUB_TOKEN } = process.env; // Generate yours: https://github.com/settings/tokens/new (must have repo scope)
const [ REPOSITORY_OWNER, REPOSITORY_NAME, BRANCH_NAME ] = process.argv.slice(2);

// See: https://docs.github.com/en/free-pro-team@latest/rest/reference/git#trees
const REPOSITORY_URL = `https://api.github.com/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}`;

const headers = {
  // Accept: 'application/vnd.github.v3+json',
  Accept: 'application/vnd.github.nebula-preview+json',
  Authorization: `Bearer ${GITHUB_TOKEN}`,
};

const main = async () => {
  // Get the sha of the last commit on BRANCH_NAME
  const { data } = await axios({ url: REPOSITORY_URL, headers });
  console.log(data);
};


main()
  .catch((error) => console.log(error.response.data));
