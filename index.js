const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3000;

const year = new Date().getFullYear();

// PostgreSQL connection pool
const pool = new Pool({
    user: 'ensclient',
    host: 'ens-client.cfzb4vlbttqg.us-east-2.rds.amazonaws.com',
    database: 'postgres',
    password: 'gQ9Sf8cIczKhZiCswXXy',
    port: 5432,
    max: 20,
    ssl: {
      rejectUnauthorized: false, // Ignore unauthorized SSL errors (not recommended for production)
    },
});

app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello, world!');
  });

app.get('/client/:clientKey', async (req, res) => {
  const clientKey = req.params.clientKey;

  try {
    const client = await pool.query('SELECT * FROM clients WHERE key = $1', [clientKey]);

    if (client.rows.length === 0) {
      res.status(404).json({ error: 'Client not found' });
    } else {
      res.json(client.rows);
    }
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/data/:clientKey', async (req, res) => {
    const clientKey = req.params.clientKey;

    const pool2 = new Pool({
        user: 'ensahost_client',
        host: `client-${clientKey}.cfzb4vlbttqg.us-east-2.rds.amazonaws.com`,
        database: 'postgres',
        password: 'ZCK,tCI8lv4o',
        port: 5432,
        max: 20,
        ssl: {
          rejectUnauthorized: false, // Ignore unauthorized SSL errors (not recommended for production)
        },
    });
  
    try {
      const client = await pool2.query(`SELECT * FROM client_data_${year} WHERE active = 'yes'`);
  
      if (client.rows.length === 0) {
        res.status(404).json({ error: 'Client not found' });
      } else {
        res.json(client.rows);
      }
    } catch (error) {
      console.error('Error executing query', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/count/:clientKey', async (req, res) => {
    const clientKey = req.params.clientKey;

    const pool2 = new Pool({
        user: 'ensahost_client',
        host: `client-${clientKey}.cfzb4vlbttqg.us-east-2.rds.amazonaws.com`,
        database: 'postgres',
        password: 'ZCK,tCI8lv4o',
        port: 5432,
        max: 20,
        ssl: {
          rejectUnauthorized: false, // Ignore unauthorized SSL errors (not recommended for production)
        },
    });
  
    try {
        // Get count for the current date
        const currentDateCountResult = await pool2.query(
            `SELECT COUNT(*) FROM client_data_${year} WHERE DATE(creation) = CURRENT_DATE`
          );
          const currentDateCount = currentDateCountResult.rows[0].count;
    
        // Get count for all entries in the table
        const totalCountResult = await pool2.query(
          `SELECT COUNT(*) FROM client_data_${year}`
        );
        const totalCount = totalCountResult.rows[0].count;
    
        res.json({
          currentDateCount,
          year,
          totalCount,
        });
      } catch (error) {
        console.error('Error executing query', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});