const { runTests } = require('./api.test');

runTests().catch(err => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
