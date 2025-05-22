module.exports = {
  apps: [
    {
      name      : "todo-api",
      script    : "src/app.js",
      instances : "max",
      exec_mode : "cluster",
      watch     : false
    },
    {
      name   : "todo-worker",
      script : "src/worker.js",
      watch  : false
    }
  ]
};
