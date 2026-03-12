const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/database');
const { initializeDatabase } = require('./database/initDatabase');

const startServer = async () => {
  try {
    await pool.query('SELECT 1');
    await initializeDatabase();

    app.listen(env.port, () => {
      console.log(`Backend server listening on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start backend server.', error);
    process.exit(1);
  }
};

startServer();
