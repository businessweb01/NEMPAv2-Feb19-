const express = require('express');
const multer = require('multer');
const mssql = require('mssql');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env.development' }); // Load .env file
const jwtDecode = require('jwt-decode');
// Set up express app
const app = express();
const port = 5000;
const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log("WebSocket Server started on ws://localhost:8080");
});

const clients = new Set(); // Store connected clients
// Enable CORS
app.use(cors()); // Allow all origins
app.use(express.json());
// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Store files in 'uploads' folder
  },
  filename: (req, file, cb) => {
    const { firstName, lastName } = req.body;
    const fileExtension = path.extname(file.originalname);
    cb(null, `${firstName}${lastName}(ValidID)${fileExtension}`);
  }
});

const upload = multer({ storage });

// MSSQL Configuration
const sqlConfig = {
  user: 'sa',
  password: 'Eugene12042001',
  server: 'LAPTOP-NI-POGI',
  database: 'NEMPA',
  options: {
    instanceName: "SQLEXPRESS",
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 15000,
  requestTimeout: 15000,
};

// Create a connection pool once
let pool;

async function connectToDatabase() {
  if (!pool) {
    try {
      pool = await mssql.connect(sqlConfig);
      console.log('Connected to the database successfully');
    } catch (err) {
      console.error('Database connection failed:', err);
      process.exit(1); // Exit if connection fails
    }
  }
  return pool;
}

// 📌 Middleware to parse form-data and handle file upload
app.post('/submit', upload.single('validId'), async (req, res) => {
  const { lastName, firstName, middleName, birthday, contactNumber, address, dataRegistered } = req.body;
  const validIdFileName = req.file ? req.file.filename : 'No file uploaded';

  try {
    const pool = await connectToDatabase();
    const currentYear = new Date().getFullYear();

    // Check if the client already exists based on fname, mname, and lname
    const existingClient = await pool.request()
      .input('firstName', mssql.NVarChar, firstName)
      .input('middleName', mssql.NVarChar, middleName)
      .input('lastName', mssql.NVarChar, lastName)
      .query(`
        SELECT TOP 1 client_id FROM client_info
        WHERE fname = @firstName AND mname = @middleName AND lname = @lastName
      `);

    if (existingClient.recordset.length > 0) {
      // Client already exists, generate JWT token with existing clientId
      const clientId = existingClient.recordset[0].client_id;
      const token = jwt.sign(
        { clientId, firstName, lastName },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return res.status(200).json({ message: 'Client already exists', clientId, token });
    }

    // Get the highest client_id for the current year
    const result = await pool.request()
      .input('currentYear', mssql.Int, currentYear)
      .query(`
        SELECT TOP 1 client_id FROM client_info
        WHERE client_id LIKE CONCAT(@currentYear, '%')
        ORDER BY client_id DESC
      `);

    let clientId = `${currentYear}01`;

    if (result.recordset.length > 0) {
      const lastClientId = result.recordset[0].client_id;
      const newIdNumber = parseInt(lastClientId.slice(-2), 10) + 1;
      clientId = `${currentYear}${String(newIdNumber).padStart(2, '0')}`;
    }

    // Insert new client data if client does not exist
    await pool.request()
      .input('clientId', mssql.NVarChar, clientId)
      .input('lastName', mssql.NVarChar, lastName)
      .input('firstName', mssql.NVarChar, firstName)
      .input('middleName', mssql.NVarChar, middleName)
      .input('birthday', mssql.NVarChar, birthday)
      .input('contactNumber', mssql.NVarChar, contactNumber)
      .input('address', mssql.NVarChar, address)
      .input('validIdFileName', mssql.NVarChar, validIdFileName)
      .input('dataRegistered', mssql.NVarChar, dataRegistered)
      .query(`
        INSERT INTO client_info (client_id, lname, fname, mname, bday, cont_num, address, valid_id, reg_date)
        VALUES (@clientId, @lastName, @firstName, @middleName, @birthday, @contactNumber, @address, @validIdFileName, @dataRegistered)
      `);

    // Generate JWT Token for new client
    const token = jwt.sign(
      { clientId, firstName, lastName },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ message: 'Data inserted successfully!', clientId, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error inserting data into the database.' });
  }
});



// The route to handle loan submissions
app.post('/submit-loan', async (req, res) => {
  // Destructure the required data from the request body
  const { clientId, loanAmount, loanInterest, noOfMonths, loanDate, total, biWeeklyAmortization } = req.body;

  try {
    // Log the request body to check if loanAmount has a value
    console.log('Request Body:', req.body);
    
    const pool = await mssql.connect(sqlConfig);

    // Generate loan reference number (loanRefNo) with the current year and incrementing number
    const currentYear = new Date().getFullYear();
    const result = await pool.request()
      .input('currentYear', mssql.Int, currentYear)
      .query(`
        SELECT TOP 1 LoanRefNo
        FROM Loans
        WHERE LoanRefNo LIKE '${currentYear}%'
        ORDER BY LoanRefNo DESC
      `);

    let loanRefNo = `${currentYear}0001`;  // Default to the first loan of the year

    if (result.recordset.length > 0) {
      const lastLoanRefNo = result.recordset[0].LoanRefNo; // Ensure correct column name (case-sensitive)
      
      if (lastLoanRefNo) {
        const newRefNo = parseInt(lastLoanRefNo.slice(-4)) + 1;
        loanRefNo = `${currentYear}${String(newRefNo).padStart(4, '0')}`;
      } else {
        console.error('No valid loanRefNo found');
        loanRefNo = `${currentYear}0001`; // Reset if the reference number is invalid
      }
    }
    const noOfTerms =  noOfMonths *2;
    const status = 'Waiting for Approval';
    const notReleased = 'No';
    // Insert the loan data into the loan table
    const resultInsert = await pool.request()
      .input('clientId', mssql.NVarChar, clientId)
      .input('loanRefNo', mssql.NVarChar, loanRefNo)
      .input('loanAmount', mssql.Float, loanAmount)
      .input('loanInterest', mssql.Int, loanInterest)
      .input('noOfMonths', mssql.Int, noOfMonths)
      .input('loanDate', mssql.Date, loanDate)  // Insert the loan date
      .input('total', mssql.Float, total)
      .input('biWeeklyAmortization', mssql.Float, biWeeklyAmortization)
      .input('noOfTerms',mssql.Int, noOfTerms)
      .input('onGoing', mssql.NVarChar, status)
      .input('notReleased', mssql.NVarChar, notReleased)
      .query(`
        INSERT INTO Loans (LoanRefNo, client_id, LoanAmount, interest, noOfMonths, LoanDate, TotalAmount,biWeeklyPay,running_balance,no_of_terms,status,isReleased)
        VALUES (@loanRefNo, @clientId, @loanAmount, @loanInterest, @noOfMonths, @loanDate, @total, @biWeeklyAmortization, @total, @noOfTerms,@onGoing,@notReleased)
      `);

    // Return response with the token
    res.status(200).json({
      message: 'Loan data inserted successfully!',loanRefNo});
  } catch (err) {
    console.error('Error inserting loan data:', err);
    res.status(500).json({ message: 'Error inserting loan data.' });
  }
});




app.get('/loanData', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]; // Assuming Bearer token format
  if (!token) {
    return res.status(400).send('Token missing');
  }

  const decodedToken = jwtDecode(token);
  const { loanRefNo, clientId } = decodedToken;
  const status = 'On Going';
  try {
    const pool = await mssql.connect(sqlConfig); // Ensure that sqlConfig is defined and correct
    const result = await pool.request() // Corrected query using pool.request()
      .input('loanRefNo', mssql.NVarChar, loanRefNo) // Use parameterized queries for security
      .input('clientId', mssql.NVarChar, clientId)
      .input('onGoing', mssql.NVarChar, status)
      .query(`
        SELECT LoanRefNo, client_id, LoanAmount, TotalAmount, noOfMonths, LoanDate, interest, biWeeklyPay,running_balance 
        FROM Loans 
        WHERE LoanRefNo = @loanRefNo AND client_id = @clientId AND status = @onGoing
      `);

    if (result.recordset.length > 0) {
      res.json(result.recordset[0]); // Send loan data back
    } else {
      res.status(404).send('Loan not found');
    }
  } catch (error) {
    console.error('Database query error', error);
    res.status(500).send('Internal server error');
  }
});


app.post("/make-payment", async (req, res) => {
  const { currentLoanId, paymentDate, payment } = req.body;

  try {
    const pool = await mssql.connect(sqlConfig);
    const currentYear = new Date().getFullYear();

    // ✅ Generate unique PaymentID
    const result = await pool.request()
      .input("currentYear", mssql.Int, currentYear)
      .query(`
        SELECT TOP 1 PaymentID FROM Payments 
        WHERE PaymentID LIKE '${currentYear}%' ORDER BY PaymentID DESC
      `);

    let nextSeries = 1;
    if (result.recordset.length > 0) {
      const lastPaymentID = result.recordset[0].PaymentID;
      nextSeries = parseInt(lastPaymentID.slice(-6)) + 1;
    }
    const nextPaymentID = `${currentYear}${String(nextSeries).padStart(6, "0")}`;

    // ✅ Check if it's the first payment
    const lastPayment = await pool.request()
      .input("loanRefNo", mssql.NVarChar, currentLoanId)
      .query(`
        SELECT TOP 1 NextPaymentDate 
        FROM Payments 
        WHERE LoanRefNo = @loanRefNo 
        ORDER BY PaymentDateTo DESC
      `);

    let paymentDateFrom, paymentDateTo, nextPaymentDate;

    if (lastPayment.recordset.length === 0) {
      // 🔹 First-time payment: Use releasedWhen & PaymentStartAt from Loans table
      const firstPaymentDate = await pool.request()
        .input("loanRefNo", mssql.NVarChar, currentLoanId)
        .query(`SELECT releasedWhen, PaymentStartAt FROM Loans WHERE LoanRefNo = @loanRefNo`);
    
      if (firstPaymentDate.recordset.length > 0) {
        paymentDateFrom = new Date(firstPaymentDate.recordset[0].releasedWhen);
        paymentDateTo = new Date(firstPaymentDate.recordset[0].PaymentStartAt);
      } else {
        return res.status(400).json({ message: "Loan details not found." });
      }
    } else {
      // 🔹 Next payments: Use the **previous row's `NextPaymentDate`** as `PaymentDateFrom`
      paymentDateFrom = new Date(lastPayment.recordset[0].NextPaymentDate);
      paymentDateTo = new Date(paymentDateFrom); // Ensure this is a Date object
      paymentDateTo.setDate(paymentDateTo.getDate() + 14);
    
      // ✅ Avoid weekends for `PaymentDateTo`
      if (paymentDateTo.getDay() === 6) paymentDateTo.setDate(paymentDateTo.getDate() + 2); // Saturday → Monday
      if (paymentDateTo.getDay() === 0) paymentDateTo.setDate(paymentDateTo.getDate() + 1); // Sunday → Monday
    }

    // ✅ Convert dates to YYYY-MM-DD format
    const formattedPaymentDateFrom = paymentDateFrom.toISOString().split("T")[0];
    const formattedPaymentDateTo = paymentDateTo.toISOString().split("T")[0];

    // ✅ Calculate Next Payment Date (bi-weekly, avoiding weekends)
    nextPaymentDate = new Date(paymentDateTo);
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 14);

    // ✅ Avoid weekends for `NextPaymentDate`
    if (nextPaymentDate.getDay() === 6) nextPaymentDate.setDate(nextPaymentDate.getDate() + 2); // Saturday → Monday
    if (nextPaymentDate.getDay() === 0) nextPaymentDate.setDate(nextPaymentDate.getDate() + 1); // Sunday → Monday

    // ✅ Convert NextPaymentDate to YYYY-MM-DD format
    const formattedNextPaymentDate = nextPaymentDate.toISOString().split("T")[0];

    // ✅ Insert payment into Payments table
    const insertedPayment = await pool.request()
      .input("PaymentID", mssql.NVarChar, nextPaymentID)
      .input("LoanRefNo", mssql.NVarChar, currentLoanId)
      .input("PaymentAmount", mssql.Decimal(18, 2), payment)
      .input("PaymentDateFrom", mssql.Date, formattedPaymentDateFrom)
      .input("PaymentDateTo", mssql.Date, formattedPaymentDateTo)
      .query(`
        INSERT INTO Payments (PaymentID, LoanRefNo, PaymentAmount, PaymentDateFrom, PaymentDateTo)
        OUTPUT INSERTED.PaymentID
        VALUES (@PaymentID, @LoanRefNo, @PaymentAmount, @PaymentDateFrom, @PaymentDateTo)
      `);
  
    // ✅ Ensure `@PaymentID` exists in UPDATE query
    const newPaymentID = insertedPayment.recordset[0].PaymentID;

    // ✅ Update running balance
    await pool.request()
      .input("LoanRefNo", mssql.NVarChar, currentLoanId)
      .input("PaymentAmount", mssql.Decimal(18, 2), payment)
      .query(`
        UPDATE Loans
        SET running_balance = running_balance - @PaymentAmount
        WHERE LoanRefNo = @LoanRefNo
      `);

    // ✅ Get updated loan details
    const updatedLoan = await pool.request()
      .input("LoanRefNo", mssql.NVarChar, currentLoanId)
      .query(`
        SELECT running_balance, TotalAmount, biWeeklyPay 
        FROM Loans WHERE LoanRefNo = @LoanRefNo
      `);

    const updatedData = updatedLoan.recordset[0];

    // ✅ If fully paid, update loan status
    if (updatedData.running_balance <= 0) {
      await pool.request()
        .input("fullyPaid", mssql.NVarChar, "Fully Paid")
        .input("LoanRefNo", mssql.NVarChar, currentLoanId)
        .query(`UPDATE Loans SET status = @fullyPaid WHERE LoanRefNo = @LoanRefNo`);
    }

    // ✅ Ensure `@PaymentID` exists in UPDATE query
    await pool.request()
      .input("LoanRefNo", mssql.NVarChar, currentLoanId)
      .input("PaymentID", mssql.NVarChar, newPaymentID)
      .input("NextPaymentDate", mssql.Date, formattedNextPaymentDate)
      .query(`
        UPDATE Payments SET NextPaymentDate = @NextPaymentDate 
        WHERE LoanRefNo = @LoanRefNo AND PaymentID = @PaymentID
      `);

    res.status(200).json({
      updatedLoanAmount: updatedData.running_balance,
      updatedTotalAmount: updatedData.TotalAmount,
      updatedbiWeeklyAmount: updatedData.biWeeklyPay,
      nextPaymentDate: formattedNextPaymentDate,
      message: "Payment recorded successfully!",
    });

  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ message: "Error processing payment.", error: error.message });
  }
});

app.get('/PendingLoans', async (req, res) => {
  try {
    const pool = await mssql.connect(sqlConfig);
    const result = await pool.request()
      .query(`
        SELECT l.LoanRefNo, l.LoanDate, l.LoanAmount, l.status, c.fname, c.lname
        FROM Loans l
        JOIN client_info c ON l.client_id = c.client_id
        WHERE l.status IN ('Waiting for Approval', 'Approved')
      `);

    const loans = result.recordset.map(row => ({
      id: row.LoanRefNo, // Use LoanRefNo as the id
      date: row.LoanDate,
      status: row.status,
      amount: row.LoanAmount,
      customer: {
        name: `${row.fname} ${row.lname}`,
      }
    }));

    res.json(loans); // Send the loans data back as JSON
  } catch (err) {
    console.error('Database query failed', err);
    res.status(500).send('Error retrieving data from database');
  }
});

app.post('/submitLoanApprovals', async (req, res) => {
  const { loanId, approvedDate, approvers } = req.body; // approvers is an array

  if (!Array.isArray(approvers) || approvers.length === 0) {
    return res.status(400).json({ success: false, message: "Approvers list is empty or invalid." });
  }

  try {
    const pool = await mssql.connect(sqlConfig);
    const currentYear = new Date().getFullYear();

    // Query the latest approved_id for the current year
    const result = await pool.request()
      .input('currentYear', mssql.Int, currentYear)
      .query(`
        SELECT TOP 1 approved_id
        FROM approvers
        WHERE approved_id LIKE '${currentYear}%'
        ORDER BY approved_id DESC
      `);

    // Determine the next series number
    let nextSeries = 1;
    if (result.recordset.length > 0) {
      const lastApprovedID = result.recordset[0].approved_id; // Correct column reference
      nextSeries = parseInt(lastApprovedID.slice(-6)) + 1;
    }

    // Insert each approver as a new row
    for (let i = 0; i < approvers.length; i++) {
      const nextApproverID = `${currentYear}${String(nextSeries + i).padStart(6, '0')}`;

      await pool.request()
        .input('ApprovedId', mssql.NVarChar, nextApproverID)
        .input('LoanRefNo', mssql.Int, loanId)
        .input('Date', mssql.Date, approvedDate)
        .input('Approver', mssql.NVarChar, approvers[i]) // Insert individual approver
        .query(`
          INSERT INTO approvers (approved_id, LoanRefNo, approvedDate, approver_name)
          VALUES (@ApprovedId, @LoanRefNo, @Date, @Approver)
        `);
    }

    // Update the status of the loan to "Approved"
    await pool.request()
      .input('LoanRefNo', mssql.Int, loanId)
      .query(`
        UPDATE Loans
        SET status = 'Approved'
        WHERE LoanRefNo = @LoanRefNo
      `);

    res.status(200).json({ success: true, message: 'Loan approval submitted successfully.' });

  } catch (error) {
    console.error('Error processing loan approval:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

app.get('/fetchApprovers/:loanId', async (req, res) => {
  const loanId = req.params.loanId;  // Get loanId from URL params

  try {
    // Query the database for approvers related to the loanId
    const pool = await mssql.connect(sqlConfig);
    const result = await pool.request()
      .input('loanId', mssql.NVarChar, loanId) // Assuming loanId is an integer
      .query('SELECT approver_name FROM approvers WHERE LoanRefNo = @loanId');  // Your query to fetch approvers

    if (result.recordset.length > 0) {
      // If approvers are found, send them as the response
      res.json({
        success: true,
        approvers: result.recordset.map(row => ({
          name: row.approver_name,  // Assuming the column in the database is `approver_name`
        })),
      });
    }
  } catch (err) {
    console.error('Error fetching approvers:', err);
    res.status(500).json({ success: false, message: 'Error fetching approvers' });
  }
});

wss.on("connection", (ws) => {
  console.log("New client connected");

  // Check if the client is already in the set (avoid duplicates)
  if (!clients.has(ws)) {
    clients.add(ws);
  }

  // Function to fetch loan counts
  const sendLoanCounts = async () => {
    try {
      const pool = await mssql.connect(sqlConfig);
      const result = await pool.request().query(`
        SELECT 
          (SELECT COUNT(*) FROM Loans WHERE status = 'Waiting for Approval') AS pendingCount,
          (SELECT COUNT(*) FROM Loans WHERE status = 'Released') AS releasedCount
      `);

      const counts = {
        type: "loanCounts",
        pendingCount: result.recordset[0].pendingCount,
        releasedCount: result.recordset[0].releasedCount,
      };

      // Send updates to all connected clients
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(counts));
        }
      });

    } catch (error) {
      console.error("Error fetching loan counts:", error);
    }
  };

  // Send initial data when a client connects
  sendLoanCounts();

  // Start interval only once for the first client
  if (clients.size === 1) {
    console.log("Starting loan update interval...");
    global.loanUpdateInterval = setInterval(sendLoanCounts, 10000);
  }

  // Cleanup when client disconnects
  ws.on("close", () => {
    console.log("Client disconnected");
    clients.delete(ws);

    // Stop the interval if no clients are connected
    if (clients.size === 0) {
      console.log("No clients connected, stopping interval...");
      clearInterval(global.loanUpdateInterval);
      delete global.loanUpdateInterval;
    }
  });
});

app.post('/releaseLoan', async (req, res) => {
  const { loanId, releasedBy, releasedDate, PaymentStartAt } = req.body;

  try {
    const pool = await mssql.connect(sqlConfig);

    console.log('releasedBy:', releasedBy);
    // Update the loan status to Released and set other fields
    const result = await pool.request()
      .input('loanId', mssql.NVarChar, loanId)
      .input('releasedBy', mssql.NVarChar, releasedBy) 
      .input('releasedDate', mssql.Date, releasedDate)
      .input('PaymentStartAt', mssql.Date, PaymentStartAt)
      .query(`
        UPDATE Loans
        SET isReleased = 'Yes', status = 'Released', releasedBy = @releasedBy, releasedWhen = @releasedDate, PaymentStartAt = @PaymentStartAt
        WHERE LoanRefNo = @loanId
      `);

    res.status(200).json({ message: 'Loan Released successfully!' });

  } catch (err) {
    console.error('Error releasing loan:', err);
    res.status(500).json({ message: 'Error releasing loan.' });
  }
});

app.get('/OnGoingLoans', async (req, res) => {
  try {
    const pool = await mssql.connect(sqlConfig);

    // Fetch all ongoing loans (status = 'Released')
    const result = await pool.request().query(`
      SELECT 
          l.LoanRefNo, 
          l.biWeeklyPay, 
          l.running_balance, 
          l.PaymentStartAt, 
          l.status, 
          c.fname, 
          c.lname,
          -- Get the latest NextPaymentDate only for the newest inserted row
          COALESCE(
              (SELECT TOP 1 NextPaymentDate 
              FROM Payments p
              WHERE p.LoanRefNo = l.LoanRefNo 
              ORDER BY p.PaymentDateTo DESC, p.PaymentID DESC), -- ✅ Ensures newest record
              l.PaymentStartAt
          ) AS DueDate
      FROM Loans l
      JOIN client_info c ON l.client_id = c.client_id
      WHERE l.status = 'Released';
    `);

    const loans = result.recordset.map(row => ({
      id: row.LoanRefNo, // Use LoanRefNo as the id
      dueDate: row.DueDate, // ✅ Ensuring newest NextPaymentDate is used
      biWeeklyPay: row.biWeeklyPay,
      amount: row.running_balance,
      status: row.status,
      customer: {
        name: `${row.fname} ${row.lname}`,
      }
    }));

    res.json(loans); // Send the loans data back as JSON
  } catch (err) {
    console.error('Database query failed', err);
    res.status(500).send('Error retrieving data from database');
  }
});



// Start the server
app.listen(port, async () => {
  await connectToDatabase(); // Ensure database is connected before accepting requests
  console.log(`Server running on port ${port}`);
});
