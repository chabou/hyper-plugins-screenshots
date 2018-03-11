require("now-env");

const { GraphQLClient } = require("graphql-request");
const { router, get } = require("microrouter");
const [repoOwner, repoName] = require("../package.json").repository.split("/");

const endpoint = "https://api.github.com/graphql";

const client = new GraphQLClient(endpoint, {
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
  }
});

const query = `
  query($repoOwner: String!, $repoName: String!, $assetName: String!) {
    repository(owner:$repoOwner, name:$repoName) {
      releases(last: 10) {
        edges {
          node {
            name
            publishedAt
            releaseAssets(last: 100, name: $assetName) {
              edges {
                node {
                  name
                  downloadUrl
                }
              }
            }
          }
        }
      }
    }
  }
`;

const getPlugin = async (req, res) => {
  const os = req.params.os || "darwin";
  const assetName = `${req.params.pluginName}-${os}.png`;

  const data = await client.request(query, {
    repoOwner,
    repoName,
    assetName
  });
  const release = data.repository.releases.edges.find(
    release =>
      release.node.releaseAssets.edges &&
      release.node.releaseAssets.edges.length > 0 &&
      release.node.releaseAssets.edges[0].node.downloadUrl
  );
  if (!release) {
    res.statusCode = 404;
    res.end();
    return;
  }
  const URL = release.node.releaseAssets.edges[0].node.downloadUrl;
  res.statusCode = 302;
  res.setHeader("Location", URL);
  res.end();
};

module.exports = router(
  get("/:pluginName", getPlugin),
  get("/:pluginName/:os", getPlugin)
);
