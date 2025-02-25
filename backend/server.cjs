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
  const { clientId, loanAmount, loanInterest, noOfMonths, loanDate, total, biWeeklyAmortization, OldloanId } = req.body;

  try {
    console.log('Request Body:', req.body);
    const pool = await mssql.connect(sqlConfig);
    const balanceResult = await pool.request()
      .query('SELECT TOP 1 remaining_Bal FROM coop_balance');
    const remainingBal = balanceResult.recordset[0] ? balanceResult.recordset[0].remaining_Bal : 0;

    // Check if loanAmount is greater than remaining_Bal
    if (loanAmount > remainingBal) {
      return res.status(400).json({ message: 'Insufficient remaining balance to process the loan.' });
    }
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

    // Get client_id from Loans table if clientId is null or empty
    let finalClientId = clientId;
    if (!clientId) {
      const clientIdResult = await pool.request()
        .input('OldloanId', mssql.NVarChar, OldloanId)
        .query(`
          SELECT client_id
          FROM Loans
          WHERE LoanRefNo = @OldloanId
        `);
      if (clientIdResult.recordset.length > 0) {
        finalClientId = clientIdResult.recordset[0].client_id;
        console.log('Retrieved client_id:', finalClientId);
      } else {
        throw new Error('Could not find client_id for the given OldloanId');
      }
    }

    const noOfTerms = noOfMonths * 2;  // Assuming bi-weekly payments
    const status = 'Waiting for Approval';
    const notReleased = 'No';
    const interest_Amount = total - loanAmount;
    // Insert the loan data into the loan table
    const resultInsert = await pool.request()
      .input('clientId', mssql.NVarChar, finalClientId)
      .input('loanRefNo', mssql.NVarChar, loanRefNo)
      .input('loanAmount', mssql.Float, loanAmount)
      .input('loanInterest', mssql.Int, loanInterest)
      .input('noOfMonths', mssql.Int, noOfMonths)
      .input('loanDate', mssql.Date, loanDate)  // Insert the loan date
      .input('total', mssql.Float, total)
      .input('biWeeklyAmortization', mssql.Float, biWeeklyAmortization)
      .input('noOfTerms', mssql.Int, noOfTerms)
      .input('onGoing', mssql.NVarChar, status)
      .input('notReleased', mssql.NVarChar, notReleased)
      .input('interest_Amount', mssql.Float, interest_Amount)
      .query(`
        INSERT INTO Loans (LoanRefNo, client_id, LoanAmount, interest, noOfMonths, LoanDate, TotalAmount, biWeeklyPay, running_balance, no_of_terms, status, isReleased,interest_Amount)
        VALUES (@loanRefNo, @clientId, @loanAmount, @loanInterest, @noOfMonths, @loanDate, @total, @biWeeklyAmortization, @total, @noOfTerms, @onGoing, @notReleased, @interest_Amount)
      `);

    // Return response with the loan reference number
    res.status(200).json({
      message: 'Loan data inserted successfully!',
      loanRefNo
    });
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


// ✅ Function to ensure the date is not on a weekend (only for NextPaymentDate)
function avoidWeekends(date) {
  const day = date.getDay(); // 0 is Sunday, 6 is Saturday
  if (day === 6) { // Saturday
    date.setDate(date.getDate() + 2); // Move to Monday
  } else if (day === 0) { // Sunday
    date.setDate(date.getDate() + 1); // Move to Monday
  }
  return date;
}

app.post("/make-payment", async (req, res) => {
  const { currentLoanId, paymentDate, payment } = req.body;
  // Update the remaining balance in coop_balance
  await pool.request()
  .input("paymentAmount", mssql.Float, payment)
  .query(`
    UPDATE coop_balance
    SET remaining_Bal = remaining_Bal + @paymentAmount
  `);
  await pool.request()
  .input("paymentAmount", mssql.Float, payment)
  .query(`
    UPDATE coop_balance 
    SET used_Bal = CASE
      WHEN used_Bal - @paymentAmount < 0 THEN 0
      ELSE used_Bal - @paymentAmount
    END
  `);
  
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
      // 🔹 First-time payment: Use releasedWhen as PaymentDateFrom and PaymentStartAt as PaymentDateTo
      const firstPaymentDate = await pool.request()
        .input("loanRefNo", mssql.NVarChar, currentLoanId)
        .query(`SELECT releasedWhen, PaymentStartAt FROM Loans WHERE LoanRefNo = @loanRefNo`);
    
      if (firstPaymentDate.recordset.length > 0) {
        paymentDateFrom = new Date(firstPaymentDate.recordset[0].releasedWhen);  // releasedWhen as PaymentDateFrom
        paymentDateTo = new Date(firstPaymentDate.recordset[0].PaymentStartAt); // PaymentStartAt as PaymentDateTo
      } else {
        return res.status(400).json({ message: "LoanRefNo not found in Loans table." });
      }

      // ✅ Add 15 days to PaymentDateTo to get NextPaymentDate
      nextPaymentDate = new Date(paymentDateTo);
      nextPaymentDate.setDate(paymentDateTo.getDate() + 15);  // Add 15 days for the NextPaymentDate

      // ✅ Avoid weekends for NextPaymentDate only
      nextPaymentDate = avoidWeekends(nextPaymentDate);
    } else {
      // 🔹 Next payments: Use the NextPaymentDate of the previous payment
      nextPaymentDate = new Date(lastPayment.recordset[0].NextPaymentDate);
      paymentDateTo = new Date(nextPaymentDate);  // PaymentDateTo is the NextPaymentDate of the previous payment

      // Calculate PaymentDateFrom as 15 days before NextPaymentDate
      paymentDateFrom = new Date(nextPaymentDate);
      paymentDateFrom.setDate(paymentDateFrom.getDate() - 14);  // Ensure it's exactly 15 days earlier

      // **DO NOT avoid weekends on PaymentDateFrom or PaymentDateTo**. These should always be exactly 15 days apart.
    }

    // Convert dates to YYYY-MM-DD format
    const formattedPaymentDateFrom = paymentDateFrom.toISOString().split("T")[0];
    const formattedPaymentDateTo = paymentDateTo.toISOString().split("T")[0];
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
    const fullyPaidDate = new Date(); // Get the current date as a Date object
    const dateAsString = fullyPaidDate.toISOString().split("T")[0];
    if (updatedData.running_balance <= 0) {
      // Update loan status to "Fully Paid"
      await pool.request()
        .input("fullyPaid", mssql.NVarChar, "Fully Paid")
        .input("fullyPaidDate", mssql.NVarChar, dateAsString) // Pass the Date object directly
        .input("LoanRefNo", mssql.NVarChar, currentLoanId)
        .query(`
          UPDATE Loans 
          SET status = @fullyPaid, fullyPaidAt = @fullyPaidDate 
          WHERE LoanRefNo = @LoanRefNo
        `);
    
      // Update PaymentDateFrom, PaymentDateTo, and NextPaymentDate to 'Paid'
      await pool.request()
        .input("LoanRefNo", mssql.NVarChar, currentLoanId)
        .input("PaymentID", mssql.NVarChar, newPaymentID)
        .query(`
          UPDATE Payments 
          SET NextPaymentDate = 'Paid' 
          WHERE LoanRefNo = @LoanRefNo AND PaymentID = @PaymentID
        `);
    
      // Calculate the total sum of all payment amounts
      const totalPayments = await pool.request()
        .input("LoanRefNo", mssql.NVarChar, currentLoanId)
        .query(`
          SELECT SUM(PaymentAmount) AS TotalPayments 
          FROM Payments 
          WHERE LoanRefNo = @LoanRefNo
        `);
    
      const totalPaidAmount = totalPayments.recordset[0].TotalPayments;
      // Update TotalAmountPaid in the Loans table
      await pool.request()
        .input("LoanRefNo", mssql.NVarChar, currentLoanId)
        .input("totalPaidAmount", mssql.Decimal(18, 2), totalPaidAmount)
        .query(`
          UPDATE Loans
          SET TotalAmountPaid = @totalPaidAmount
          WHERE LoanRefNo = @LoanRefNo
        `);
      // Respond back with a success message
      return res.status(200).json({
        message: "Loan fully paid and updated successfully!",
      });
    }
    // ✅ Ensure `@PaymentID` exists in UPDATE query for NextPaymentDate
    const NextDueDate = new Date(paymentDateTo);
    NextDueDate.setDate(paymentDateTo.getDate() + 15);
    const formattedNextDueDate = avoidWeekends(NextDueDate).toISOString().split("T")[0];

    await pool.request()
      .input("LoanRefNo", mssql.NVarChar, currentLoanId)
      .input("PaymentID", mssql.NVarChar, newPaymentID)
      .input("NextPaymentDate", mssql.Date, formattedNextDueDate)
      .query(`
        UPDATE Payments SET NextPaymentDate = @NextPaymentDate 
        WHERE LoanRefNo = @LoanRefNo AND PaymentID = @PaymentID
      `);
    res.status(200).json({
      updatedLoanAmount: updatedData.running_balance,
      updatedTotalAmount: updatedData.TotalAmount,
      updatedbiWeeklyAmount: updatedData.biWeeklyPay,
      nextPaymentDate: formattedNextDueDate,
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
    
    const loanResult = await pool.request()
      .input('loanId', mssql.Int, loanId) // Ensure proper input type (assuming loanId is an integer)
      .query(`
        SELECT LoanAmount FROM Loans WHERE LoanRefNo = @loanId
      `);
      // If no loan found
    if (loanResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    const loanAmount = loanResult.recordset[0].LoanAmount;
      // Fetch the current remaining_Bal from coop_balance
    const balanceResult = await pool.request()
    .query('SELECT remaining_Bal FROM coop_balance');

    if (balanceResult.recordset.length === 0) {
    return res.status(404).json({ error: 'No balance found' });
    }

    const remainingBalance = balanceResult.recordset[0].remaining_Bal;

    // Subtract LoanAmount from remaining_Bal
    const newRemainingBalance = remainingBalance - loanAmount;

    // Update coop_balance with new remaining_Bal and used_Bal
    await pool.request()
    .query(`
      UPDATE coop_balance
      SET remaining_Bal = ${newRemainingBalance}, used_Bal = ${loanAmount}
    `);
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
    console.log(loans.loanAmount);
    res.json(loans); // Send the loans data back as JSON
  } catch (err) {
    console.error('Database query failed', err);
    res.status(500).send('Error retrieving data from database');
  }
});

app.get('/PaidLoans', async (req, res) => {
  try {
    const pool = await mssql.connect(sqlConfig);

    // Fetch all fully paid loans (status = 'Fully Paid')
    const result = await pool.request().query(`
      SELECT 
          l.LoanRefNo,
          l.LoanAmount,
          l.Interest,
          l.fullyPaidAt, 
          l.TotalAmountPaid,
          l.status, 
          c.fname, 
          c.lname
      FROM Loans l
      JOIN client_info c ON l.client_id = c.client_id
      WHERE l.status = 'Fully Paid';
    `);
    
    const loans = result.recordset.map(row => ({
      id: row.LoanRefNo, // Use LoanRefNo as the id
      clientId: row.client_id,
      fullyPaidAt: row.fullyPaidAt, // ✅ Ensuring newest NextPaymentDate is used
      loanAmount: row.LoanAmount,
      totalAmountPaid: row.TotalAmountPaid,
      interest: row.Interest,
      status: row.status,
      customer: {
        name: `${row.fname} ${row.lname}`,
      }
    }));
    console.log(loans.loanAmount);
    res.json(loans); // Send the loans data back as JSON
  } catch (err) {
    console.error('Database query failed', err);
    res.status(500).send('Error retrieving data from database');
  }
});


app.post('/fetchLoanDetails', async (req, res) => {
  const { loanId } = req.body;
  try {
    const pool = await mssql.connect(sqlConfig);
    
    // Get loan details and total payments in a single query
    const result = await pool.request()
      .input('loanId', mssql.NVarChar, loanId)
      .query(`
        SELECT 
          l.*,
          ISNULL((
            SELECT SUM(PaymentAmount) 
            FROM Payments 
            WHERE LoanRefNo = @loanId
          ), 0) as TotalPayments
        FROM Loans l
        WHERE l.LoanRefNo = @loanId
      `);

    if (result.recordset.length > 0) {
      const loanDetails = result.recordset[0];
      res.json(loanDetails);
    } else {
      res.status(404).json({ message: 'Loan not found.' });
    }

  } catch (err) {
    console.error('Error fetching loan details:', err);
    res.status(500).json({ message: 'Error fetching loan details.' });
  }
});

// Backend Route for Balance Data and Monthly Income Combined
wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');

  // Fetch data for coop_balance (total balance)
  const fetchCoopBalanceAndSend = async () => {
    try {
      const pool = await mssql.connect(sqlConfig);

      // Query to get the balance data from coop_balance
      const result = await pool.request()
        .query(`
          SELECT 
            remaining_Bal AS totalBalance, 
            used_Bal AS usedBalance,
            beginning_Bal AS beginningBalance
          FROM coop_balance
        `);

      if (!result.recordset || result.recordset.length === 0) {
        console.log("No data returned from the coop_balance table.");
        ws.send(JSON.stringify({ error: 'No data returned from the coop_balance table.' }));
        return;
      }

      const data = {
        type: 'balance_data',
        totalBalance: result.recordset[0].totalBalance || 0,
        usedBalance: result.recordset[0].usedBalance || 0,
        beginningBalance: result.recordset[0].beginningBalance || 0
      };

      // Send the coop_balance data to the client
      ws.send(JSON.stringify(data));
    } catch (err) {
      console.error('Error fetching coop_balance data:', err);
      ws.send(JSON.stringify({ error: 'Failed to fetch coop_balance data' }));
    }
  };

  // Fetch data for monthly income
  const fetchMonthlyIncomeAndSend = async () => {
    try {
      const pool = await mssql.connect(sqlConfig);

      // Query to get the monthly income data from Loans table
      const result = await pool.request()
        .query(`
          SELECT 
            FORMAT(CAST(fullyPaidAt AS DATETIME), 'yyyy-MM') AS paymentMonth,
            SUM(interest_Amount) AS monthlyIncome
          FROM Loans
          WHERE status IN ('Fully Paid', 'Fully Paid(Recomputed)') 
            AND fullyPaidAt IS NOT NULL
          GROUP BY FORMAT(CAST(fullyPaidAt AS DATETIME), 'yyyy-MM')
        `);

      if (!result.recordset || result.recordset.length === 0) {
        console.log("No data returned from the Loans table.");
        ws.send(JSON.stringify({ error: 'No data returned from the Loans table.' }));
        return;
      }

      const data = {
        type: 'monthly_income_data',
        monthlyIncome: {}  // To store monthly income by month key (yyyy-MM)
      };

      // Organize the data by month
      result.recordset.forEach(row => {
        const month = row.paymentMonth;
        data.monthlyIncome[month] = row.monthlyIncome;
      });

      // Ensure all months are accounted for (filling missing months with 0)
      const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      const monthlyIncomeData = months.map(month => {
        const monthKey = `2025-${month}`;
        return data.monthlyIncome[monthKey] || 0; // Default to 0 if no income for the month
      });

      // Send the monthly income data to the client
      ws.send(JSON.stringify({
        type: 'monthly_income_data',
        monthlyIncome: monthlyIncomeData
      }));
    } catch (err) {
      console.error('Error fetching monthly income data:', err);
      ws.send(JSON.stringify({ error: 'Failed to fetch monthly income data' }));
    }
  };

  // Fetch data for loan requests per month (LoanDate)
  const fetchLoanRequestsPerMonthAndSend = async () => {
    try {
      const pool = await mssql.connect(sqlConfig);

      // Query to get the loan requests per month (LoanDate column)
      const result = await pool.request()
        .query(`
          SELECT 
            FORMAT(CAST(LoanDate AS DATETIME), 'yyyy-MM') AS requestMonth, 
            COUNT(*) AS loanRequests
          FROM Loans
          WHERE LoanDate IS NOT NULL
          GROUP BY FORMAT(CAST(LoanDate AS DATETIME), 'yyyy-MM')
        `);

      if (!result.recordset || result.recordset.length === 0) {
        console.log("No data returned from the Loans table for loan requests.");
        ws.send(JSON.stringify({ error: 'No data returned from the Loans table for loan requests.' }));
        return;
      }

      const data = {
        type: 'loan_requests_data',
        loanRequestsPerMonth: {}  // To store loan requests by month key (yyyy-MM)
      };

      // Organize the data by month
      result.recordset.forEach(row => {
        const month = row.requestMonth;
        data.loanRequestsPerMonth[month] = row.loanRequests;
      });

      // Ensure all months are accounted for (filling missing months with 0)
      const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      const loanRequestsData = months.map(month => {
        const monthKey = `2025-${month}`;
        return data.loanRequestsPerMonth[monthKey] || 0; // Default to 0 if no requests for the month
      });

      // Send the loan requests per month data to the client
      ws.send(JSON.stringify({
        type: 'loan_requests_data',
        loanRequestsPerMonth: loanRequestsData
      }));
    } catch (err) {
      console.error('Error fetching loan requests per month data:', err);
      ws.send(JSON.stringify({ error: 'Failed to fetch loan requests per month data' }));
    }
  };

  // Fetch data for released loans per month (releasedWhen)
  const fetchReleasedLoansPerMonthAndSend = async () => {
    try {
      const pool = await mssql.connect(sqlConfig);

      // Query to get the released loans per month (releasedWhen column)
      const result = await pool.request()
        .query(`
          SELECT 
            FORMAT(CAST(releasedWhen AS DATETIME), 'yyyy-MM') AS releaseMonth, 
            COUNT(*) AS releasedLoans
          FROM Loans
          WHERE releasedWhen IS NOT NULL
          GROUP BY FORMAT(CAST(releasedWhen AS DATETIME), 'yyyy-MM')
        `);

      if (!result.recordset || result.recordset.length === 0) {
        console.log("No data returned from the Loans table for released loans.");
        ws.send(JSON.stringify({ error: 'No data returned from the Loans table for released loans.' }));
        return;
      }

      const data = {
        type: 'released_loans_data',
        releasedLoansPerMonth: {}  // To store released loans by month key (yyyy-MM)
      };

      // Organize the data by month
      result.recordset.forEach(row => {
        const month = row.releaseMonth;
        data.releasedLoansPerMonth[month] = row.releasedLoans;
      });

      // Ensure all months are accounted for (filling missing months with 0)
      const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      const releasedLoansData = months.map(month => {
        const monthKey = `2025-${month}`;
        return data.releasedLoansPerMonth[monthKey] || 0; // Default to 0 if no releases for the month
      });

      // Send the released loans per month data to the client
      ws.send(JSON.stringify({
        type: 'released_loans_data',
        releasedLoansPerMonth: releasedLoansData
      }));
    } catch (err) {
      console.error('Error fetching released loans per month data:', err);
      ws.send(JSON.stringify({ error: 'Failed to fetch released loans per month data' }));
    }
  };

  // Send initial data when the client connects
  fetchCoopBalanceAndSend();
  fetchMonthlyIncomeAndSend();
  fetchLoanRequestsPerMonthAndSend();
  fetchReleasedLoansPerMonthAndSend();

  // Send periodic updates every 10 seconds
  const intervalId = setInterval(() => {
    fetchCoopBalanceAndSend();
    fetchMonthlyIncomeAndSend();
    fetchLoanRequestsPerMonthAndSend();
    fetchReleasedLoansPerMonthAndSend();
  }, 10000);

  // Listen for messages from the client
  ws.on('message', (message) => {
    console.log('Received message:', message);
  });

  // Cleanup when the connection is closed
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clearInterval(intervalId); // Clear the interval when the client disconnects
  });
});

app.get('/FetchLoanDetails/:loanId', async (req, res) => {
  const { loanId } = req.params;
  console.log(loanId);
  try {
    const pool = await mssql.connect(sqlConfig);
    
    // Query to get loan payments for a given loanId
    const paymentsQuery = `
      SELECT PaymentDateFrom, PaymentDateTo, PaymentAmount
      FROM Payments
      WHERE LoanRefNo = @loanId
    `;
    
    // Query to get loan approvers for the given loanId
    const approversQuery = `
      SELECT approver_name
      FROM approvers
      WHERE LoanRefNo = @loanId
    `;
    const releasedByQuery = `
      SELECT releasedBy
      FROM Loans
      WHERE LoanRefNo = @loanId
    `;
    const clientIdQuery = `
      SELECT client_id
      FROM Loans
      WHERE LoanRefNo = @loanId
    `;
    // Running both queries in parallel
    const paymentsResult = await pool.request()
      .input('loanId', mssql.NVarChar, loanId)
      .query(paymentsQuery);
    
    const approversResult = await pool.request()
      .input('loanId', mssql.NVarChar, loanId)
      .query(approversQuery);
    
      const releasedByResult = await pool.request()
      .input('loanId', mssql.NVarChar, loanId)
      .query(releasedByQuery);

    const clientIdResult = await pool.request()
      .input('loanId', mssql.NVarChar, loanId)
      .query(clientIdQuery);


    // Send the results as JSON
    res.json({
      loanPayments: paymentsResult.recordset,
      loanApprovers: approversResult.recordset,
      releasedByWho: releasedByResult.recordset,
      clientId: clientIdResult.recordset
    });
    console.log(paymentsResult.recordset);
    console.log(approversResult.recordset);
    console.log(releasedByResult.recordset);
    console.log(clientIdResult.recordset);
    console.log(clientIdResult.recordset);
    
  } catch (err) {
    console.error('Error fetching loan details:', err);
    res.status(500).json({ message: 'Error fetching loan details.' });
  }
});

/// Route to fetch all loan details
app.get('/fetch-all-loan-details', (req, res) => {
  // Query to fetch LoanRefNo, fullyPaidAt, totalAmountPaid, and status from the Loans table
  const loanQuery = `
    SELECT LoanRefNo, fullyPaidAt, totalAmountPaid, status, releasedBy 
    FROM Loans 
    WHERE status IN ('Released', 'Fully Paid', 'Fully Paid(Recomputed)');
  `;

  pool.query(loanQuery, (err, result) => {
      if (err) {
          return res.status(500).json({ error: 'Failed to fetch loans' });
      }

      // Ensure you're accessing the recordset, not just the result object
      const loanRows = result.recordset; // This will be an array of rows

      if (!Array.isArray(loanRows)) {
          return res.status(500).json({ error: 'Unexpected response structure from the database' });
      }

      // Create an array of LoanRefNos
      const loanRefNos = loanRows.map(row => row.LoanRefNo);

      if (loanRefNos.length === 0) {
          return res.status(200).json({ message: 'No loans found' });
      }

      // Query to fetch Payments based on LoanRefNos
      const paymentsQuery = `
          SELECT LoanRefNo, PaymentAmount, PaymentDateTo 
          FROM Payments 
          WHERE LoanRefNo IN (${loanRefNos.map(refNo => `'${refNo}'`).join(', ')});
      `;

      // Run the payments query to fetch payments
      pool.query(paymentsQuery, (err, paymentResult) => {
          if (err) {
              return res.status(500).json({ error: 'Failed to fetch payments' });
          }

          const paymentRows = paymentResult.recordset;

          // Combine the data into a result
          const result = loanRefNos.map(refNo => {
              const loan = loanRows.find(loan => loan.LoanRefNo === refNo);
              const payments = paymentRows.filter(payment => payment.LoanRefNo === refNo);

              // Determine the payment date based on loan status
              let paymentDate = '';
              let displayAmount = 0; // This will hold the amount to display based on status

              if (loan.status === 'Fully Paid' || loan.status === 'Fully Paid(Recomputed)') {
                  paymentDate = loan.fullyPaidAt; // Use fullyPaidAt for Fully Paid or Fully Paid(Recomputed)
                  displayAmount = loan.totalAmountPaid; // Use totalAmountPaid for Fully Paid status
              } else if (loan.status === 'Released') {
                  paymentDate = payments[0]?.PaymentDateTo || ''; // Use PaymentDateTo for Released
                  displayAmount = payments.reduce((total, payment) => total + payment.PaymentAmount, 0); // Sum all PaymentAmount for Released
              }

              return {
                  LoanRefNo: loan.LoanRefNo,
                  Status: loan.status,
                  TotalAmountPaid: loan.totalAmountPaid,
                  ReleasedBy: loan.releasedBy,
                  Payments: payments.map(payment => ({
                      PaymentAmount: loan.status === 'Fully Paid' || loan.status === 'Fully Paid(Recomputed)' ? loan.totalAmountPaid : payment.PaymentAmount,
                      PaymentDate: paymentDate, // Use the determined payment date
                  })),
                  DisplayAmount: displayAmount // Add the display amount (either totalAmountPaid or PaymentAmount)
              };
          });

          // Send the response back with the combined data
          res.status(200).json(result);
      });
  });
});

app.post('/PayRecomputedLoan', async (req, res) => {
  const { loanId, recomputedAmount, recomputeInterestValue, recomputeDate, dateNow, status, balance, startOfPayment } = req.body;
  console.log(req.body);
  try{
    const pool = await mssql.connect(sqlConfig);
    await pool.request()
      .input('loanId', mssql.NVarChar, loanId)
      .query(`
        SELECT l.*, 
        (SELECT COUNT(*) FROM Payments WHERE LoanRefNo = @loanId) as PaymentCount
        FROM Loans l 
        WHERE l.LoanRefNo = @loanId
      `);
      const paymentCount = result.recordset[0].PaymentCount;

    const result = await pool.request()
      .input('loanId', mssql.NVarChar, loanId)
      .input('recomputedAmount', mssql.Float, recomputedAmount)
      .input('recomputeInterestValue', mssql.Float, recomputeInterestValue)
      .input('recomputeDate', mssql.Date, recomputeDate)
      .input('dateNow', mssql.Date, dateNow)
      .input('status', mssql.VarChar, status)
      .input('balance', mssql.Float, balance)
      .query(`
        UPDATE Loans
        SET status = @status, running_balance = @balance, fullyPaidAt = @dateNow, totalAmountPaid = @recomputedAmount, interest_Amount = @recomputeInterestValue
      `);
  }catch(error){
    console.error("Error recomputing:", error);
    res.status(500).json({ message: 'Error recomputing.' });
  }
});





// Start the server
app.listen(port, async () => {
  await connectToDatabase(); // Ensure database is connected before accepting requests
  console.log(`Server running on port ${port}`);
});
