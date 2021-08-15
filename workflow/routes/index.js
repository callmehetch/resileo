const services = require('./workflow');

module.exports = (app) => {
  app.use('/workflow', services);
}
