const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const envVars = {};

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#]+?)=(.+)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

module.exports = {
  apps: [
    {
      name: "leadcop-next",
      cwd: "/var/www/leadcop.io",
      script: "npm",
      args: "start",
      env: {
        ...envVars,
        NODE_ENV: "production",
        PORT: 8080
      },
      max_memory_restart: "1G",
      instances: 1,
      exec_mode: "fork"
    },
  ],
};
