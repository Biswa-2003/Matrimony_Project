// PM2 process file: keeps the app running and restarts it after a crash or a server reboot.
//   pm2 start deploy/ecosystem.config.cjs     (first time)
//   pm2 reload matrimoney                      (after each deploy - deploy.sh does this)
//   pm2 logs matrimoney                        (see the app's output)
const path = require("path");
const APP_DIR = path.resolve(__dirname, "..");

module.exports = {
  apps: [
    {
      name: "matrimoney",
      cwd: path.join(APP_DIR, ".next/standalone"),
      script: "server.js",
      // settings (database, secrets, email) come from .env.production in the project folder
      node_args: `--env-file=${path.join(APP_DIR, ".env.production")}`,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "127.0.0.1", // only Nginx can reach the app; it is not open to the internet directly
      },
      // one copy: the rate limiter and session cache live in memory, so they must be shared by one process
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "900M",
      time: true,
    },
  ],
};
