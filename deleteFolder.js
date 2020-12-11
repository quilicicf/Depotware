/**
 * This file shows how to delete a folder from a GitHub repository using the REST v3 API
 * Because it is not trivial...
 * It was last tested to work on 2020/12/11
 *
 * The script is supposed to be called like this: node commit.js quilicicf Depotware myBranch
 * Where the arguments are in order: the owner of the repository, the name of the repository and
 * the name of the branch where the commit will be done.
 *
 * It assumes there is a valid GitHub personal access token available as environment variable: GITHUB_TOKEN
 * Make sure you keep those tokens short-lived, revoke it when you are done!
 *
 * It uses https://www.npmjs.com/package/axios as HTTP client, run `npm install axios` in the same
 * folder before running it (contribution to remove this dependency welcome).
 *
 * Fiddle with the object FOLDER_TO_DELETE to see how the script behaves.
 */

const axios = require('axios');

const { GITHUB_TOKEN } = process.env; // Generate yours: https://github.com/settings/tokens/new (must have repo scope)
const [ REPOSITORY_OWNER, REPOSITORY_NAME, BRANCH_NAME ] = process.argv.slice(2);

const TYPE = { BLOB: 'blob', TREE: 'tree' };

const FOLDER_TO_DELETE = 'apis';

// See: https://docs.github.com/en/free-pro-team@latest/rest/reference/git#commits
const COMMITS_URL = `https://api.github.com/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/git/commits`;

// See: https://docs.github.com/en/free-pro-team@latest/rest/reference/git#trees
const REPOSITORY_TREES_URL = `https://api.github.com/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/git/trees`;

// See: https://docs.github.com/en/free-pro-team@latest/rest/reference/git#get-a-reference
const REF_URL = `https://api.github.com/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/git/refs/heads/${BRANCH_NAME}`;

const headers = {
  Accept: 'application/vnd.github.v3+json',
  Authorization: `Bearer ${GITHUB_TOKEN}`,
};

const main = async () => {
  // Get the sha of the last commit on BRANCH_NAME
  const { data: { object: { sha: currentCommitSha } } } = await axios({ url: REF_URL, headers });

  // Get the sha of the root tree on the commit retrieved previously
  const COMMIT_URL = `${COMMITS_URL}/${currentCommitSha}`;
  const { data: { tree: { sha: treeSha } } } = await axios({ url: COMMIT_URL, headers });

  // Get the tree corresponding to the folder that must be deleted.
  // Uses the recursive query parameter to retrieve all files whatever the depth.
  // The result might come back truncated if the number of hits is big.
  // This truncated output case is NOT handled.
  const { data: { tree: oldTree } } = await axios({
    url: `${REPOSITORY_TREES_URL}/${BRANCH_NAME}:${FOLDER_TO_DELETE}`,
    headers,
    params: { recursive: true },
  });

  // Create a tree to edit the content of the repository, basically select all files
  // in the previous tree and mark them with sha=null to delete them.
  // The folder only exists in git if it has a file in its offspring.
  const newTree = oldTree
    .filter(({ type }) => type === TYPE.BLOB)
    .map(({ path, mode, type }) => (
      { path: `${FOLDER_TO_DELETE}/${path}`, sha: null, mode, type } // If sha is null => the file gets deleted
    ));

  // Create a new tree with the file offspring of the target folder removed
  const { data: { sha: newTreeSha } } = await axios({
    url: REPOSITORY_TREES_URL,
    method: 'POST',
    headers,
    data: {
      base_tree: treeSha,
      tree: newTree,
    },
  });

  // Create a commit that uses the tree created above
  const { data: { sha: newCommitSha } } = await axios({
    url: COMMITS_URL,
    method: 'POST',
    headers,
    data: {
      message: 'Committing with GitHub\'s API :fire:',
      tree: newTreeSha,
      parents: [ currentCommitSha ],
    },
  });

  // Make BRANCH_NAME point to the created commit
  await axios({
    url: REF_URL,
    method: 'POST',
    headers,
    data: { sha: newCommitSha },
  });
};


main()
  .catch((error) => console.log(error.response.data));

