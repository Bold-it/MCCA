const { Client } = require('pg');

const passwords = [
  '',
  'postgres',
  'admin',
  'password',
  '1234',
  '123456',
  '12345678',
  '123456789',
  'root',
  'admin123',
  'postgres123',
  'password123',
  'barbara',
  'barbara123',
  'Awuitor',
  'awuitor',
  'barbie',
  'barbs',
  'babs',
  'Barbara',
  'BarbaraAwuitor',
  'barbaraawuitor',
  'pw',
  'pw123',
  'mmca',
  'mmca123',
  'mmca_db',
  'database',
  'development',
  'dev'
];

async function probe() {
  for (const password of passwords) {
    const client = new Client({
      host: 'localhost',
      port: 5433,
      user: 'postgres',
      password: password,
      database: 'postgres'
    });
    try {
      await client.connect();
      console.log(`SUCCESS: Connected as postgres on port 5433 with password "${password}"`);
      
      const res = await client.query("SELECT 1 FROM pg_database WHERE datname='mmca_db'");
      if (res.rowCount === 0) {
        console.log("Database 'mmca_db' does not exist. Creating it...");
        await client.query("CREATE DATABASE mmca_db");
        console.log("Database 'mmca_db' created successfully.");
      } else {
        console.log("Database 'mmca_db' already exists.");
      }
      
      await client.end();
      return;
    } catch (err) {
      if (err.code !== '28P01') {
        console.log(`Other error for "${password}": Code ${err.code}, ${err.message}`);
      }
    }
  }
  console.log("All passwords failed.");
}

probe().then(() => process.exit(0));
