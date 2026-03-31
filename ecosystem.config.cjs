module.exports = {
  apps: [{
    name: "email-verifier",
    script: "artifacts/api-server/dist/index.mjs",
    cwd: "/var/www/Temp-Email-SDK",
    node_args: "--enable-source-maps --env-file=.env",
    env: {
      NODE_ENV: "production"
    }
  }]
};
