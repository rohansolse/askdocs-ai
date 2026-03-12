const fs = require('fs/promises');
const path = require('path');
const { pool } = require('../config/database');

const schemaPath = path.resolve(__dirname, 'schema.sql');

const initializeDatabase = async () => {
  const schemaSql = await fs.readFile(schemaPath, 'utf8');
  await pool.query(schemaSql);
};

module.exports = {
  initializeDatabase
};

