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
  host: 'ens-client-v2.cfzb4vlbttqg.us-east-2.rds.amazonaws.com',
  database: 'postgres',
  password: 'gQ9Sf8cIczKhZiCswXXy',
  port: 5432,
  max: 20,
  ssl: {
    rejectUnauthorized: false, // Ignore unauthorized SSL errors (not recommended for production)
  },
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
      res.json(client.rows[0]);
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

app.get('/today/:clientKey', async (req, res) => {
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
          // Fetch all incidents created today
          const todayDataResult = await pool2.query(
              `SELECT * FROM client_data_${year} WHERE DATE(creation) = CURRENT_DATE`
          );
          const todayData = todayDataResult.rows;
  
          if (todayData.length === 0) {
              res.status(404).json({ error: 'No data found for today' });
          } else {
              res.json(todayData);  // Return all incidents from today
          }
      } catch (error) {
          console.error('Error executing query', error);
          res.status(500).json({ error: 'Internal server error' });
      }
});

app.get('/report/:clientKey', async (req, res) => {
  const clientKey = req.params.clientKey;
  const { dateRange, hours, startDate, endDate } = req.query;

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

  let query = `SELECT * FROM client_data_${year} WHERE `;  // Adjust table name based on your schema
  let queryParams = [];

  try {
    if (dateRange) {
      // Handle predefined date ranges (e.g., 'currentDay', 'lastWeek')
      switch (dateRange) {
        case 'currentDay':
          query += "DATE(creation) = CURRENT_DATE";
          break;
        case 'last24Hours':
          query += "creation >= NOW() - INTERVAL '24 HOURS'";
          break;
        case 'currentWeek':
          query += "EXTRACT(WEEK FROM creation) = EXTRACT(WEEK FROM NOW())";
          break;
        case 'currentMonth':
          query += "EXTRACT(MONTH FROM creation) = EXTRACT(MONTH FROM NOW())";
          break;
        case 'lastWeek':
          query += "creation >= NOW() - INTERVAL '1 WEEK'";
          break;
        case 'lastMonth':
          query += "EXTRACT(MONTH FROM creation) = EXTRACT(MONTH FROM NOW() - INTERVAL '1 MONTH')";
          break;
        // Add more predefined ranges if needed...
        default:
          return res.status(400).json({ error: 'Invalid date range' });
      }
    } else if (hours) {
      // Handle "Select Number of Hours" case
      query += "creation >= NOW() - INTERVAL $1 HOUR";
      queryParams.push(hours);
    } else if (startDate && endDate) {
      // Handle custom date range
      query += "creation BETWEEN $1 AND $2";
      queryParams.push(startDate, endDate);
    } else {
      return res.status(400).json({ error: 'Invalid date range or parameters' });
    }

    const result = await pool2.query(query, queryParams);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No data found for the given range' });
    } else {
      res.json(result.rows);  // Return filtered data
    }
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});