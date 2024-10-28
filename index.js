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
  let startYear, endYear;

  // Determine the years to query based on the custom date range or current year
  if (startDate && endDate) {
    startYear = new Date(startDate).getFullYear();
    endYear = new Date(endDate).getFullYear();
  } else {
    startYear = currentYear;
    endYear = currentYear;
  }

  try {
    for (let year = startYear; year <= endYear; year++) {
      let query = `SELECT * FROM client_data_${year} WHERE `;
      let queryParams = [];  // Reset queryParams for each year

      console.log('Received dateRange:', dateRange);
      console.log('Received hours:', hours);

      if (hours) {
        // Handle the 'hours' parameter independently
        query += `creation >= NOW() AT TIME ZONE 'America/New_York' - INTERVAL '${hours} HOUR'`;
      } else if (dateRange) {
        // Handle predefined date ranges
        switch (dateRange) {
          case 'currentActive':
            query += "active = 'yes'";
            break;

          case 'currentDay':
            query += "DATE(creation::DATE) = CURRENT_DATE";  // Cast creation to DATE
            break;

          case 'last24Hours':
            query += "creation::TIMESTAMP >= NOW() - INTERVAL '24 HOURS'";  // Cast to TIMESTAMP for this case
            break;

          case 'currentWeek':
            query += "EXTRACT(WEEK FROM creation::DATE) = EXTRACT(WEEK FROM NOW())";  // Cast to DATE
            break;

          case 'lastWeek':
            query += "creation::TIMESTAMP >= NOW() - INTERVAL '1 WEEK'";  // Cast to TIMESTAMP
            break;

          case 'currentMonth':
            query += "EXTRACT(MONTH FROM creation::DATE) = EXTRACT(MONTH FROM NOW())";  // Cast to DATE
            break;

          case 'lastMonth':
            query += "EXTRACT(MONTH FROM creation::DATE) = EXTRACT(MONTH FROM NOW() - INTERVAL '1 MONTH')";  // Cast to DATE
            break;

          case 'currentQuarter':
            query += "EXTRACT(QUARTER FROM creation::DATE) = EXTRACT(QUARTER FROM NOW())";  // Cast to DATE
            break;

          case 'lastQuarter':
            query += "EXTRACT(QUARTER FROM creation::DATE) = EXTRACT(QUARTER FROM NOW() - INTERVAL '3 MONTH')";  // Cast to DATE
            break;

          case 'currentYear':
            query += "EXTRACT(YEAR FROM creation::DATE) = EXTRACT(YEAR FROM NOW())";  // Cast to DATE
            break;

          case 'lastYear':
            query += "EXTRACT(YEAR FROM creation::DATE) = EXTRACT(YEAR FROM NOW() - INTERVAL '1 YEAR')";  // Cast to DATE
            break;

          case 'selectDateRange':
            // Handle custom date range
            if (startDate && endDate) {
              const isValidStartDate = /^\d{4}-\d{2}-\d{2}$/.test(startDate);
              const isValidEndDate = /^\d{4}-\d{2}-\d{2}$/.test(endDate);

              console.log('Received startDate:', startDate);
              console.log('Received endDate:', endDate);
              console.log('Is valid startDate:', isValidStartDate);
              console.log('Is valid endDate:', isValidEndDate);

              if (!isValidStartDate || !isValidEndDate) {
                return res.status(400).json({ error: 'Invalid date format, expected YYYY-MM-DD' });
              }

              // Cast creation to DATE for comparison
              if (year === startYear && year === endYear) {
                query += "creation::DATE BETWEEN $1::DATE AND $2::DATE";  // Cast creation and params to DATE
                queryParams.push(startDate, endDate);
              } else if (year === startYear) {
                query += "creation::DATE >= $1::DATE";  // Cast creation and startDate to DATE
                queryParams.push(startDate);
              } else if (year === endYear) {
                query += "creation::DATE <= $1::DATE";  // Now push endDate to $1 for final year
                queryParams.push(endDate);
              } else {
                query += "1 = 1";  // For intermediate years, fetch all records
              }
            } else {
              console.log('Missing startDate or endDate');
              return res.status(400).json({ error: 'Start and End date parameters are missing' });
            }
            break;

          default:
            console.log('Unknown dateRange:', dateRange);
            console.log('Request Query Parameters:', req.query);
            return res.status(400).json({ error: 'Invalid date range' });
        }
      } else {
        console.log('Invalid request. Missing date range or start/end dates.');
        return res.status(400).json({ error: 'Invalid request. Missing date range, hours, or start/end dates.' });
      }

      // Log generated queries for debugging
      console.log(`Generated Query for Year ${year}:`, query);
      console.log(`Query Params for Year ${year}:`, queryParams);

      // Add the query to the list
      queries.push(pool2.query(query, queryParams));  // Push the query with the corresponding parameters
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