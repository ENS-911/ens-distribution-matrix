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
  const currentYear = new Date().getFullYear();

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

  let queries = [];
  let queryParams = [];
  let startYear, endYear;

  // Determine the years to query based on the selected date range
  if (dateRange === 'selectDateRange' && startDate && endDate) {
    startYear = new Date(startDate).getFullYear();
    endYear = new Date(endDate).getFullYear();
  } else {
    startYear = currentYear;
    endYear = currentYear;
  }

  try {
    // Generate a query for each year between startYear and endYear
    for (let year = startYear; year <= endYear; year++) {
      let query = `SELECT * FROM client_data_${year} WHERE `;

      // Apply date range or other filters
      switch (dateRange) {
        case 'currentActive':
          query += "status = 'active'";
          break;
        case 'currentDay':
          query += "DATE(creation) = CURRENT_DATE";
          break;
        case 'last24Hours':
          query += "creation >= NOW() - INTERVAL '24 HOURS'";
          break;
        case 'selectHours':
          query += "creation >= NOW() - INTERVAL $1 HOUR";
          queryParams.push(hours);
          break;
        case 'currentWeek':
          query += "EXTRACT(WEEK FROM creation) = EXTRACT(WEEK FROM NOW())";
          break;
        case 'lastWeek':
          query += "creation >= NOW() - INTERVAL '1 WEEK'";
          break;
        case 'currentMonth':
          query += "EXTRACT(MONTH FROM creation) = EXTRACT(MONTH FROM NOW())";
          break;
        case 'lastMonth':
          query += "EXTRACT(MONTH FROM creation) = EXTRACT(MONTH FROM NOW() - INTERVAL '1 MONTH')";
          break;
        case 'currentQuarter':
          query += "EXTRACT(QUARTER FROM creation) = EXTRACT(QUARTER FROM NOW())";
          break;
        case 'lastQuarter':
          query += "EXTRACT(QUARTER FROM creation) = EXTRACT(QUARTER FROM NOW() - INTERVAL '3 MONTH')";
          break;
        case 'currentYear':
          query += "EXTRACT(YEAR FROM creation) = EXTRACT(YEAR FROM NOW())";
          break;
        case 'lastYear':
          query += "EXTRACT(YEAR FROM creation) = EXTRACT(YEAR FROM NOW() - INTERVAL '1 YEAR')";
          break;
        case 'selectDateRange':
          if (year === startYear && year === endYear) {
            query += "creation BETWEEN $1 AND $2";
            queryParams.push(startDate, endDate);
          } else if (year === startYear) {
            query += "creation >= $1";
            queryParams.push(startDate);
          } else if (year === endYear) {
            query += "creation <= $2";
            queryParams.push(endDate);
          }
          break;
        default:
          return res.status(400).json({ error: 'Invalid date range' });
      }

      queries.push(pool2.query(query, queryParams));
    }

    // Execute all queries and combine the results
    const results = await Promise.all(queries);
    let combinedResults = [];
    results.forEach(result => {
      combinedResults = combinedResults.concat(result.rows);
    });

    if (combinedResults.length === 0) {
      return res.status(404).json({ error: 'No data found for the given range' });
    } else {
      return res.json(combinedResults);  // Return the combined data
    }
  } catch (error) {
    console.error('Error executing query', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});