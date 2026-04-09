module.exports = {
  apps: [{
    name: "leadcop-live",
    script: "artifacts/api-server/dist/index.mjs",
    cwd: "/var/www/leadcop.io",
    node_args: "--enable-source-maps --env-file=.env",
    env: {
      NODE_ENV: "production",
      PORT: "8080"
    }
  }]
};
