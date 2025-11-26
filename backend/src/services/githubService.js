/**
 * GitHub Service
 * Handles GitHub API integration for deploying previews to GitHub Pages
 */

const { Octokit } = require('@octokit/rest');
const path = require('path');

// Initialize Octokit with GitHub token
let octokit = null;

/**
 * Get or initialize Octokit instance
 */
function getOctokit() {
  if (!octokit) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is not set');
    }
    octokit = new Octokit({ auth: token });
  }
  return octokit;
}

/**
 * Get GitHub configuration from environment
 */
function getConfig() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!owner || !repo) {
    throw new Error('GITHUB_OWNER and GITHUB_REPO environment variables are required');
  }

  return { owner, repo };
}

/**
 * Deploy files to GitHub Pages
 * @param {Object} options - Deployment options
 * @param {string} options.creativeName - Name of the creative
 * @param {string} options.folderPath - Folder path for the preview
 * @param {Array} options.files - Files to deploy
 * @returns {Promise<Object>} Deployment result with preview URL
 */
async function deploy({ creativeName, folderPath, files }) {
  const client = getOctokit();
  const { owner, repo } = getConfig();
  const branch = 'gh-pages';

  // Normalize folder path
  const basePath = sanitizePath(folderPath || creativeName);

  try {
    // Ensure gh-pages branch exists
    await ensureBranchExists(client, owner, repo, branch);

    // Get the current commit SHA for gh-pages
    const { data: refData } = await client.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    const currentCommitSha = refData.object.sha;

    // Get the tree SHA from the current commit
    const { data: commitData } = await client.git.getCommit({
      owner,
      repo,
      commit_sha: currentCommitSha,
    });
    const baseTreeSha = commitData.tree.sha;

    // Create blobs for all files
    const treeItems = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(basePath, file.path).replace(/\\/g, '/');
        
        const blobParams = {
          owner,
          repo,
          content: file.content,
          encoding: file.encoding === 'base64' ? 'base64' : 'utf-8',
        };

        const { data: blobData } = await client.git.createBlob(blobParams);

        return {
          path: filePath,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        };
      })
    );

    // Create a new tree with the files
    const { data: newTree } = await client.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: treeItems,
    });

    // Create a new commit
    const { data: newCommit } = await client.git.createCommit({
      owner,
      repo,
      message: `Add preview: ${creativeName}`,
      tree: newTree.sha,
      parents: [currentCommitSha],
    });

    // Update the gh-pages branch reference
    await client.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });

    // Construct preview URL
    const customDomain = process.env.CUSTOM_DOMAIN;
    let previewUrl;
    if (customDomain) {
      previewUrl = `https://${customDomain}/${basePath}/`;
    } else {
      previewUrl = `https://${owner}.github.io/${repo}/${basePath}/`;
    }

    console.log(`✅ Deployed to: ${previewUrl}`);

    return {
      success: true,
      previewUrl,
      commitSha: newCommit.sha,
    };
  } catch (error) {
    console.error('GitHub deployment error:', error);
    throw new Error(`Failed to deploy to GitHub: ${error.message}`);
  }
}

/**
 * Ensure the gh-pages branch exists, create if not
 */
async function ensureBranchExists(client, owner, repo, branch) {
  try {
    // Try to get the branch
    await client.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
  } catch (error) {
    if (error.status === 404) {
      console.log(`Creating ${branch} branch...`);
      
      // Get the default branch
      const { data: repoData } = await client.repos.get({ owner, repo });
      const defaultBranch = repoData.default_branch;

      // Get the SHA of the default branch
      const { data: defaultRef } = await client.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
      });

      // Create the gh-pages branch
      await client.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha: defaultRef.object.sha,
      });

      console.log(`✅ Created ${branch} branch`);
    } else {
      throw error;
    }
  }
}

/**
 * Sanitize folder path for use in URLs
 */
function sanitizePath(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\-_\/]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * List all previews deployed to the repository
 */
async function listDeployedPreviews() {
  const client = getOctokit();
  const { owner, repo } = getConfig();

  try {
    // Get the contents of the gh-pages branch root
    const { data: contents } = await client.repos.getContent({
      owner,
      repo,
      path: '',
      ref: 'gh-pages',
    });

    // Filter for directories (previews)
    const previews = contents
      .filter(item => item.type === 'dir')
      .map(item => ({
        name: item.name,
        path: item.path,
        url: `https://${owner}.github.io/${repo}/${item.path}/`,
      }));

    return previews;
  } catch (error) {
    if (error.status === 404) {
      return [];
    }
    throw error;
  }
}

module.exports = {
  deploy,
  ensureBranchExists,
  sanitizePath,
  listDeployedPreviews,
};
