/**
 * This file shows how to commit a set of files to a GitHub repository using the REST v3 API
 * Because it is not trivial...
 * It was last tested to work on 2020/12/10
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
 * Fiddle with the object FILES_TO_COMMIT to see how the script behaves.
 */

const axios = require('axios');

const { GITHUB_TOKEN } = process.env; // Generate yours: https://github.com/settings/tokens/new (must have repo scope)
const [ REPOSITORY_OWNER, REPOSITORY_NAME, BRANCH_NAME ] = process.argv.slice(2);

const MODES = { FILE: '100644', FOLDER: '040000' };
const TYPE = { BLOB: 'blob', TREE: 'tree' };

const FILES_TO_COMMIT = [
  {
    path: 'dir/sub/dir/file.md',
    content: '# One file!',
  },
  {
    path: 'file2.md',
    content: '# Root file!',
  },
// {
//   path: 'existingFile.md',
//   content: null, // Deletes the file (see how it's done below)
// },
];

// See: https://docs.github.com/en/free-pro-team@latest/rest/reference/git#commits
const COMMITS_URL = `https://api.github.com/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/git/commits`;

// See: https://docs.github.com/en/free-pro-team@latest/rest/reference/git#trees
const REPOSITORY_TREE_URL = `https://api.github.com/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/git/trees`;

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

  // Create a tree to edit the content of the repository
  const { data: { sha: newTreeSha } } = await axios({
    url: REPOSITORY_TREE_URL,
    method: 'POST',
    headers,
    data: {
      base_tree: treeSha,
      tree: FILES_TO_COMMIT
        .map(({ content, path }) => (
          content
            ? { path, content, mode: MODES.FILE, type: TYPE.BLOB } // Works for text files, utf-8 assumed
            : { path, sha: null, mode: MODES.FILE, type: TYPE.BLOB } // If sha is null => the file gets deleted
        )),
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
