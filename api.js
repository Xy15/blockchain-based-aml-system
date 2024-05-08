const express = require('express');
const mysql = require('mysql');
require('dotenv').config()

const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express(); //Create Express Application on the app variable
const crypto = require('crypto');
const multer = require("multer");
const path = require("path");

const port = process.env.PORT;

// Set up storage for appeal file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "appealUploads/");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + "-" + uniqueSuffix);
    },
  });
  const upload = multer({ storage: storage });

//JWT secretKey
const mySecretKey = () => {
    return crypto.randomBytes(32).toString('hex');
  };     
  const secretKey = mySecretKey();

// create a connection pool to the database
const pool = mysql.createPool({
    connectionLimit: 30,
    host:'localhost',
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
});

// Listen for the process exit event
process.on('exit', () => {
    // end the pool when application is shutting down
    console.log('Closing database pool...');
    pool.end();
});
app.use(cors());
app.use(express.json()); //used the json file
app.use(express.urlencoded({ extended: true }));
//serve the files in /appealUploads
app.use("/uploads", express.static(path.join(__dirname, "appealUploads")));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
})

app.get("/", (req, res) => {
    res.send("Running...");
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

//Freeze Account
app.get("/freezeAccount", (req, res) => {
    const account = req.query.account;
    pool.query("UPDATE BankAccount SET accStatus = 'DEACTIVATED' WHERE ethAddress = ?;", account, (error) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the user." });
        }else{
            res.json(true);
        }
    })
})

app.get("/get/count", (req, res) => {
    const account = req.query.account;
    pool.query("SELECT COUNT(*) AS count FROM transactions;", account, (error, data) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the user." });
        } else {
            res.json({count: data[0].count, isSus: data[0].count > 8});
        }
    })
})

//Check Login Username(index.html)
app.post('/getLogin', (req, res) => {
    const username = req.body.username;
  
    pool.query("SELECT secPhrase FROM `user` WHERE `username` = ?;", username, (error, results) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the user." });
        } else {
            console.log("Retreived secPhrase from User table.");
            if (results.length > 0) {
                const secPhrase = results[0].secPhrase;
                console.log("Security Phrase is ", secPhrase);
                return res.json({ secPhrase: secPhrase });
              } else {
                console.log("The username does not exist.");
                return res.json({ secPhrase: null });
              }
        }
    });
})

//Login page(index.html)
app.post('/get/user/account', (req, res) => { 
    
    const { username, password } = req.body;
    pool.query('SELECT * FROM User WHERE username = ? AND password = ?;', [username, password], (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).send({ error: 'Error retrieving user data.' });
        } else if(result.length > 0){
            //Valid User
            pool.query('SELECT c.*,u.*,b.accNo, b.balance, b.accType, b.ethAddress FROM Client c INNER JOIN User u ON u.userID = c.userID INNER JOIN BankAccount b ON b.clientID = c.clientID WHERE c.userID = ?;', result[0].userID, (error, result2) => {
                if(error){
                    console.error(error);
                    res.status(500).send({ error: 'Error retrieving user data.' });
                }else if(result2.length > 0){
                    //User is a Client
                    const data = {
                        ...result2,
                        ethAddress: result2[0].ethAddress,
                        role: 'Client'
                    }
                    //insert to JWT
                    var clientID = result2[0].clientID;
                    var userID = result2[0].userID;
                    var username = result2[0].username;
                    const token = jwt.sign({ userID, clientID, username }, secretKey, { expiresIn: '1h' });
                    console.log(token);
                    console.log(result.accStatus);
                    //send back to front end
                    res.send({data, token}); 
                }else{
                    //User is a Officer
                    //retrieve the officer's ethAddress
                    pool.query('SELECT * FROM EthAccount e INNER JOIN ComplianceOfficer c ON c.officerID = e.officerID INNER JOIN User u ON u.userID = c.userID WHERE c.userID = ?;', result[0].userID, (error, result3) => {
                        const data = {
                            ...result3,
                            ethAddress: result3[0].ethAddress,
                            role: result3[0].position
                        }
                    //insert to JWT

                    var officerID = result3[0].officerID;
                    var userID = result[0].userID;
                    var username = result3[0].username;
                    const token = jwt.sign({ userID, officerID, username }, secretKey, { expiresIn: '1h' });
                    console.log(token);
                        res.send({data, token}); 
                    })
                }
            })
        }else{
            return res.json({ result : null });
        }
    });
});

//Retrieve balance of an account 
app.get("/get/balance", (req, res) => {
    const account = req.query.account;
    pool.query("SELECT balance FROM BankAccount WHERE ethAddress = ?;", account, (error, data) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the user." });
        } else {
            res.send(data);
        }
    })
})

//update balance for deposit
app.post("/update/balance/deposit", (req, res) => {
    const { sender, amount} = req.body;
    const addAmount = parseInt(amount);
    pool.query("UPDATE BankAccount SET balance = balance+? WHERE ethAddress = ?;", [addAmount, sender], (error) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while updating the database." });
        } else {
            res.status(200).json({ message: 'Balance updated successfully' });
        }
    })
})

//update balance for withdrawal
app.post("/update/balance/withdraw", (req, res) => {
    const { sender, amount} = req.body;
    const withdrawAmount = parseInt(amount);
    pool.query("UPDATE BankAccount SET balance = balance-? WHERE ethAddress = ?;", [withdrawAmount, sender], (error) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while updating the database." });
        } else {
            res.status(200).json({ message: 'Balance updated successfully' });
        }
    })
})

//update balance for transfering
app.post("/update/balance/transfer", (req, res) => {
    const { sender, receiver, amount } = req.body;
    const transferAmount = parseInt(amount);
    pool.query("UPDATE BankAccount SET balance = balance-? WHERE ethAddress = ?;", [transferAmount, sender], (error, data) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while updating the database." });
        } else {
            pool.query("UPDATE BankAccount SET balance = balance+? WHERE ethAddress = ?;", [transferAmount, receiver], (error, data) => {
                if (error) {
                    console.error(error);
                    res.status(500).json({ error: "An error occurred while updating the database." });
                }
                res.status(200).json({ message: 'Balance updated successfully' });
            })
        }
    })
})

app.post("/update/riskScore", (req, res) => {
    const account = req.body.account;
    pool.query("SELECT * FROM Client c INNER JOIN BankAccount b ON c.clientID = b.clientID WHERE ethAddress = ?;", [account], (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while updating the database." });
        } else if(result[0].riskScore <= 9){
            //increase riskScore by 1
            pool.query("UPDATE Client SET riskScore = riskScore+1 WHERE clientID = (SELECT clientID FROM BankAccount WHERE ethAddress = ?);", [account], (error, data) => {
                if (error) {
                    console.error(error);
                    res.status(500).json({ error: "An error occurred while updating the database." });
                } else {
                    res.status(200).json({ message: 'Risk score updated successfully' });
                }
            })
        }else{
            res.status(200).json({ message: 'Risk score reached limit.' });
        }
    })
})

//retrieve user info
app.get("/get/client", (req, res) => {
    const account = req.query.account;
    const token = req.header('Authorization');
    console.log('Token is:', token);

    if (!token) {
        return res.status(401).json({ error: 'There is no token.' });
    }

    jwt.verify(token.split(' ')[1], secretKey, (err) => {
        if (err) {
            console.error('Token failed:', err.message);
            return res.status(401).json({ error: 'Token is invalid.' });
        }

        pool.query("SELECT * FROM User u INNER JOIN Client c ON u.userID = c.userID INNER JOIN BankAccount b ON c.clientID = b.clientID WHERE ethAddress = ?;", account, (error, data) => {
            if (error) {
                console.error(error);
                res.status(500).json({ error: "An error occurred while retrieving the user." });
            }else {
                res.send(data); //return to client side
            }
        })
    })
})

app.get("/get/searchAcc", (req, res) => {
    const account = req.query.account;
    
    pool.query("SELECT * FROM User u INNER JOIN Client c ON u.userID = c.userID INNER JOIN BankAccount b ON c.clientID = b.clientID WHERE ethAddress = ?;", account, (error, data) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the user." });
        }else {
            res.send(data); //return to client side
        }
    })
})

app.get("/get/client/status", (req, res) => {
    const account = req.query.account;
    const token = req.header('Authorization');
    console.log('Token is:', token);

    if (!token) {
        return res.status(401).json({ error: 'There is no token.' });
    }

    jwt.verify(token.split(' ')[1], secretKey, (err) => {
        if (err) {
            console.error('Token failed:', err.message);
            return res.status(401).json({ error: 'Token is invalid.' });
        }

        pool.query("SELECT * FROM Client c INNER JOIN BankAccount b ON c.clientID = b.clientID WHERE ethAddress = ? AND c.accStatus = 'ACTIVE';", account, (error, data) => {
            if (error) {
                console.error(error);
                res.status(500).json({ error: "An error occurred while retrieving the user." });
            } else {
                res.send(data); //return to client side
            }
        })
    })
})

//retrieve officer info for report generation
app.get("/get/officer", (req, res) => {
    const account = req.query.account;
    pool.query("SELECT * FROM User u INNER JOIN ComplianceOfficer c ON u.userID = c.userID INNER JOIN EthAccount e ON e.officerID = c.officerID WHERE ethAddress = ?;", account, (error, data) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the user." });
        } else {
            res.send(data); //return to client side
        }
    })
})

//get all suspicious transactions associated with the user
app.get("/get/userSusTx", (req, res) => {
    const account = req.query.account;
    pool.query("SELECT * FROM SuspiciousTransactions LEFT JOIN Transactions ON transactionID = susTransactionID WHERE senderAddress = ? OR recipientAddress = ?;",[account,account], (error, data) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the transactions." });
        } else {
            res.json(data) //return to client side
        }
    })
})

//Validate Specific Transaction
app.get("/findTx", (req, res) => {
    const hash = req.query.hash;
    pool.query("SELECT * FROM Transactions LEFT JOIN SuspiciousTransactions ON transactionID = susTransactionID WHERE transactionHash = ?;", hash, (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the data." });
        } else {
            res.json(result); //return to client side
        }
    })
})

app.post("/update/txStatus", (req, res) => {
    const {status, hash, officerAddress, timeProcessed, newHash} = req.body;
    pool.query("UPDATE SuspiciousTransactions JOIN Transactions ON transactionID = susTransactionID SET transactionStatus = ?, ethAddress = ?, timeProcessed = ?, transactionHash = ? WHERE transactionHash = ?;", [status, officerAddress, timeProcessed, newHash, hash], (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the data." });
        } else {
            console.log(`Transaction ${result.susTransactionID} has been ${status}.`)
            console.log(result)
            res.json(result); //return to client side
        }
    })
})

app.get("/findSusTx", (req, res) => {
    const hash = req.query.hash;
    pool.query("SELECT * FROM SuspiciousTransactions INNER JOIN Transactions ON transactionID = susTransactionID WHERE transactionHash = ?;", hash, (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the transaction count." });
        } else {
            res.json(result); //return to client side
        }
    })
})

//Recent transactions
app.get("/get/recentTx", (req, res) => {
    const limit = parseInt(req.query.limit);
    const offset = parseInt(req.query.offset);
    pool.query("SELECT * FROM Transactions t WHERE t.transactionID NOT IN (SELECT s.susTransactionID FROM suspiciousTransactions s WHERE s.transactionStatus = 'Pending') LIMIT ? OFFSET ?;", [limit, offset], (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the data." });
        } else {
            res.send(result); //return to client side
        }
    })
})

app.get("/get/user/recentTx", (req, res) => {
    const limit = parseInt(req.query.limit);
    const offset = parseInt(req.query.offset);
    const account = req.query.account;
    pool.query(`SELECT * FROM Transactions WHERE transactionID NOT IN 
        (SELECT susTransactionID FROM SuspiciousTransactions WHERE transactionStatus = 'Pending')
         AND (senderAddress = ? OR recipientAddress = ?) LIMIT ? OFFSET ?;`, [account, account, limit, offset], (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the data." });
        } else {
            res.send(result); //return to client side
        }
    })
})

//Recent suspicious transactions
app.get("/get/susTx", (req, res) => {
    const limit = parseInt(req.query.limit);
    const offset = parseInt(req.query.offset);
    pool.query("SELECT * FROM SuspiciousTransactions LEFT JOIN Transactions ON transactionID = susTransactionID LIMIT ? OFFSET ?;", [limit, offset], (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the data." });
        } else {
            res.send(result); //return to client side
        }
    })
})

//Retrieve Pending Suspicious Transactions
app.get("/get/pendingSusTx", (req, res) => {
    pool.query("SELECT * FROM SuspiciousTransactions LEFT JOIN Transactions ON transactionID = susTransactionID WHERE transactionStatus = 'Pending' ORDER BY timestamp;", (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the data." });
        } else {
            res.send(result); //return to client side
        }
    })
})

//Retrieve Processed Suspicious Transactions
app.get("/get/cases", (req, res) => {
    pool.query("SELECT * FROM SuspiciousTransactions LEFT JOIN Transactions ON transactionID = susTransactionID WHERE transactionStatus <> 'Pending';", (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the data." });
        } else {
            res.send(result); //return to client side
        }
    })
})

//add Transaction record
app.post('/insert/tx', (req, res) => {
    const { sender, receiver, method, desc, amount, timestamp, txHash } = req.body;
    pool.query('INSERT INTO Transactions (senderAddress, recipientAddress, method, description, amount, timestamp, transactionHash) VALUES (?,?,?,?,?,?,?)', [sender, receiver, method, desc, amount, timestamp, txHash], (error, results) => {
        if (error) {
            console.error(error);
            //HTTP status -> 500 (Internal Server Error)
            //JSON response with error message
            res.status(500).json({ error: "An error occurred." });
        } else {
            console.log(`New transaction with ID ${results.insertId} added to database`);
            //sends a JSON response to the client
            res.json({ message: 'Transaction added successfully', id: results.insertId });
        }
    })
})

//add SuspiciousTransaction record
app.post('/insert/susTx', (req, res) => {
    const { sender, receiver, method, desc, amount, timestamp, txHash, status, susDesc, ethAddress, timeProcessed } = req.body;
    let id;
    try {
        pool.query('INSERT INTO Transactions (senderAddress, recipientAddress, method, description, amount, timestamp, transactionHash) VALUES (?,?,?,?,?,?,?)', [sender, receiver, method, desc, amount, timestamp, txHash], (error, results) => {
            if (error) {
                console.error(error);
                //HTTP status -> 500 (Internal Server Error)
                //JSON response with error message
                res.status(500).json({ error: "An error occurred." });
            } else {
                //retrieve new transaction's id
                id = results.insertId;
                console.log(`New transaction with ID ${id} added to database`);
                pool.query('INSERT INTO SuspiciousTransactions (susTransactionID, susDescription, transactionStatus, ethAddress, timeProcessed) VALUES (?,?,?,?,?)', [id, susDesc, status, ethAddress, timeProcessed], (error, results) => {
                    if (error) {
                        console.error(error);
                        res.status(500).json({ error: "An error occurred." });
                    } else {
                        console.log(`New suspicious transaction with ID ${id} added to database`);
                        res.json({ message: 'Transaction added successfully'});
                    }
                })
            }
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred. Please try again later." });
    }
})

app.get("/count/userTx", (req, res) => {
    const account = req.query.account;
    pool.query("SELECT COUNT(*) AS txCount FROM Transactions WHERE senderAddress = ? OR recipientAddress = ?;",[account,account], (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the transaction count." });
        } else {
            res.json({ count: result[0].txCount }); //return to client side
        }
    })
})

app.get("/count/susTx", (req, res) => {
    pool.query("SELECT COUNT(*) AS susTxCount FROM SuspiciousTransactions;", (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the transaction count." });
        } else {
            res.json({ count: result[0].susTxCount }); //return to client side
        }
    })
})

app.get("/count/susTx/status", (req, res) => {
    const status = req.query.status;
    pool.query("SELECT COUNT(*) AS transactionCount FROM SuspiciousTransactions LEFT JOIN Transactions ON transactionID = susTransactionID WHERE transactionStatus = ?;", status, (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the transaction count." });
        } else {
            res.json({ count: result[0].transactionCount }); //return to client side
        }
    })
})

app.get("/count/cases", (req, res) => {
    pool.query("SELECT COUNT(*) AS susTxCount FROM SuspiciousTransactions LEFT JOIN Transactions ON transactionID = susTransactionID WHERE transactionStatus <> 'Pending';", (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the transaction count." });
        } else {
            res.json({ count: result[0].susTxCount }); //return to client side
        }
    })
})

//Transaction is associated with a blacklisted user
app.get("/count/user/blacklisted", (req, res) => {
    const sender = req.query.sender;
    const receiver = req.query.receiver;
    pool.query("SELECT COUNT(*) AS countUser FROM BankAccount b INNER JOIN Client c ON c.clientID = b.clientID WHERE (ethAddress = ? OR ethAddress = ?) AND isBlacklisted = true;", [sender, receiver], (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the transaction count." });
        } else {
            //Associated with blacklisted user
            res.json({ isSus: result[0].countUser > 0 }); //return to client side
        }
    })
})

//Transaction involved high-risk users
app.get("/count/user/highRisk", (req, res) => {
    const sender = req.query.sender;
    const receiver = req.query.receiver;
    pool.query("SELECT COUNT(*) AS countUser FROM BankAccount b INNER JOIN Client c ON c.clientID = b.clientID WHERE (ethAddress = ? OR ethAddress = ?) AND riskScore >= 8;", [sender, receiver], (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the transaction count." });
        } else {
            //Associated with high-risk user
            res.json({ isSus: result[0].countUser > 0 }); //return to client side
        }
    })
})

//Transaction frequency from same user exceeds threshold (5) within 1 day
app.get("/count/txFrequency", (req, res) => {
    const sender = req.query.sender;
    pool.query("SELECT COUNT(*) AS transactionCount FROM Transactions WHERE senderAddress = ? AND timestamp >= UNIX_TIMESTAMP() - (1 * 24 * 60 * 60);", sender, (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the transaction count." });
        } else {
            const transactionCount = result[0].transactionCount;
            res.json({ count: transactionCount, isSus: transactionCount >= 5 }); //return to client side
        }
    })
})

//Number of withdrawal and deposit > 5 within 10 days."
app.get("/count/transactions/deposit_withdraw", (req, res) => {
    const account = req.query.account;
    const sqlCommand = "SELECT COUNT(*) AS transactionCount FROM Transactions WHERE senderAddress = ? AND method IN ('Withdraw', 'Deposit') AND timestamp >= UNIX_TIMESTAMP() - (10 * 24 * 60 * 60);";
    pool.query(sqlCommand, account, (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the transaction count." });
        } else {
            const transactionCount = result[0].transactionCount;
            res.json({ count: transactionCount, isSus: transactionCount >= 5 }); //return COUNT(*) to client side
        }
    })
})

//Number of transactions > 15 within 30 days
app.get("/count/transactions/all", (req, res) => {
    const account = req.query.account;
    const sqlCommand = "SELECT COUNT(*) AS transactionCount FROM Transactions WHERE senderAddress = ? AND timestamp >= UNIX_TIMESTAMP() - (30 * 24 * 60 * 60);"
    pool.query(sqlCommand, account, (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the transaction count." });
        } else {
            const transactionCount = result[0].transactionCount;
            res.json({ count: transactionCount, isSus: transactionCount >= 15 }); //return to client side
        }
    })
})

//Make withdrawal as soon as received (within 10 minutes)
app.get("/count/lastTx", (req, res) => {
    const sender = req.query.account;
    pool.query("SELECT COUNT(*) AS transactionCount FROM Transactions WHERE ((senderAddress = ? AND method = 'Deposit') OR (recipientAddress = ? AND method = 'Transfer')) AND timestamp >= UNIX_TIMESTAMP() - (10 * 60);", [sender, sender], (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the transaction count." });
        } else {
            const transactionCount = result[0].transactionCount;
            res.json({ count: transactionCount, isSus: transactionCount > 0 }); //return to client side
        }
    })
})

//The number of transactions between $9,000 and $10,000 exceeds 5 within 30 days.
app.get("/count/txAmount", (req, res) => {
    const sender = req.query.account;
    pool.query("SELECT COUNT(*) AS transactionCount FROM Transactions WHERE senderAddress = ? AND amount >= 9000 AND timestamp >= UNIX_TIMESTAMP() - (30 * 24 * 60 * 60);", [sender, sender], (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the transaction count." });
        } else {
            const transactionCount = result[0].transactionCount;
            res.json({ count: transactionCount, isSus: transactionCount >= 5 }); //return to client side
        }
    })
})

//Transaction amount > $5,000 AND associated user’s risk score level == high
app.get("/count/risk", (req, res) => {
    const sender = req.query.sender;
    const receiver = req.query.receiver;
    pool.query("SELECT COUNT(*) AS countRiskUser FROM Client c INNER JOIN BankAccount b ON b.clientID = c.clientID WHERE (ethAddress = ? OR ethAddress = ?) AND riskScore >= 5;", [sender, receiver], (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while retrieving the transaction count." });
        } else {
            res.json({ isSus: result[0].countRiskUser > 0 }); //return to client side
        }
    })
})


//------------------divider------------------------------------
//multiuse code to check unique
app.post('/checkUnique', (req, res) => {
    const table = req.body.table;
    const tableColumn = req.body.tableColumn;
    const idVal = req.body.idVal;
    console.log("Looking for", idVal, "from", tableColumn, "in", table, "table.");
  
    checkUnique(table, tableColumn, idVal)
      .then((isExist) => {
        res.send({ isExist });
        console.log(isExist);
      })
      .catch((error) => {
        console.error('Error checking uniqueness:', error);
        res.status(500).send('Error checking uniqueness');
      });
  });


  async function checkUnique(tableName, columnName, idVal) {
    return new Promise((resolve, reject) => {
      const checkQuery = `SELECT ${columnName} FROM ${tableName} WHERE ${columnName} = ?;`;
      pool.query(checkQuery, [idVal], (error, results) => {
        if (error) {
          console.error('Error executing query:', error);
          reject(error);
          return;
        }
  
        console.log('Retrieved Results:', results);
        const isExist = results.length > 0;
        if (isExist) {
          console.log('ID exists.');
        } else {
          console.log('ID is unique.');
        }
        resolve(isExist);
      });
    });
  }
  

//officer List Display
app.get('/officers', (req, res) => {
    const token = req.header('Authorization');
    console.log('Token is:', token);

    if (!token) {
        return res.status(401).json({ error: 'There is no token.' });
    }

    jwt.verify(token.split(' ')[1], secretKey, (err, decoded) => {
        if (err) {
            console.error('Token failed:', err.message);
            return res.status(401).json({ error: 'Token is invalid.' });
        }

        const officerID = decoded.officerID;
        console.log('OfficerID is:', officerID);

        const query = 'SELECT U.userID, O.officerID, U.username, U.name, U.phoneNo, U.email, O.hiredDate, O.salary, O.position FROM `user` U JOIN `complianceofficer` O ON U.userID = O.userID;';

        pool.query(query, (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).json({ error: 'Database query error.' });
            }

            const officers = results.map(officer => ({
                userID: officer.userID,
                officerID: officer.officerID,
                fullName: officer.name,
                phoneNo: officer.phoneNo,
                email: officer.email,
                hiredDate: officer.hiredDate,
                salary: officer.salary,
                position: officer.position
            }));

            if (officers.length > 0) {
                console.log(officers);
                return res.json({ officers });
            } else {
                console.log('No officers.');
                return res.json({
                    userID: null,
                    officerID: null,
                    fullName: null,
                    phoneNo: null,
                    email: null,
                    hiredDate: null,
                    salary: null,
                    position: null
                });
            }
        });
    });
});


//Registering a client
app.post('/insert-UserToDatabase', async (req, res) => {
    const userInfo = {
      userID: req.body.uID,
      clientID: req.body.cID,
      uName: req.body.uName,
      uPass: req.body.uPass,
      secPhrase: req.body.secPhrase,
      fullName: req.body.fName,
      phoneNum: req.body.phNo,
      email: req.body.email,
      address: req.body.address,
      DOB: req.body.DOB,
    };
    const accStatus = "ACTIVE";
    const riskScore = "0";
    const isBlacklisted = "FALSE";
    console.log(userInfo);
  
    //Store user information into server
    await storeUserInfo(userInfo.userID, userInfo.clientID, accStatus, 
                        riskScore, isBlacklisted, userInfo.uName, userInfo.uPass, 
                        userInfo.secPhrase, userInfo.fullName, userInfo.phoneNum, 
                        userInfo.email, userInfo.address, userInfo.DOB);
  
    res.send({ message: 'User registered successfully!'});
  });

  //inserts default data into BankAccount table, creates bank account
  app.post('/insert-BankAccount', async (req, res) => {
    const bankInfo = {
      clientID: req.body.uInfo.cID,
      ethAddress: req.body.ethAddress,
      accNo: req.body.accNo,
    };
    const balance = 0;
    const accStatus = "ACTIVE";
    const accType = "PERSONAL";
  
    //Store user information into server
    await createBankAccount(bankInfo.accNo, bankInfo.clientID, balance, 
                            accStatus, accType, bankInfo.ethAddress);
  
    res.send({ message: 'Account created successfully!'});
  });

  async function storeUserInfo(uID, cID, accStatus, riskScore, isBlacklisted, uName, uPass, secPhrase, fullName, phoneNo, email, address, DOB) {
    const userVals = [uID, uName, uPass, secPhrase, fullName, phoneNo, email, address, DOB];
    const clientVals = [cID, uID, accStatus, riskScore, isBlacklisted];

    const Uquery = 'INSERT INTO `user` (`userID`, `username`, `password`, `secPhrase`, `name`, `phoneNo`, `email`, `address`, `dateofbirth`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);';
    const Cquery = 'INSERT INTO `client` (`clientID`, `userID`, `accStatus`, `riskScore`, `isBlacklisted`) VALUES (?, ?, ?, ?, ?);';

    try {
        await queryAsync(Uquery, userVals); // Wait for user insert to complete
        console.log("Record inserted to user table.");

        await queryAsync(Cquery, clientVals); // Wait for client insert to complete
        console.log("Record inserted to client table.");
    } catch (error) {
        console.error('Error inserting records:', error);
        throw error; // Rethrow the error for handling at a higher level if needed
    }
}


async function storeUserInfo(uID, cID, accStatus, riskScore, isBlacklisted, uName, uPass, secPhrase, fullName, phoneNo, email, address, DOB) {
    const userVals = [uID, uName, uPass, secPhrase, fullName, phoneNo, email, address, DOB];
    const clientVals = [cID, uID, accStatus, riskScore, isBlacklisted];

    const Uquery = 'INSERT INTO `user` (`userID`, `username`, `password`, `secPhrase`, `name`, `phoneNo`, `email`, `address`, `dateofbirth`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);';
    const Cquery = 'INSERT INTO `client` (`clientID`, `userID`, `accStatus`, `riskScore`, `isBlacklisted`) VALUES (?, ?, ?, ?, ?);';

    try {
        await queryAsync(Uquery, userVals); // Wait for user insert to complete
        console.log("Record inserted to user table.");

        await queryAsync(Cquery, clientVals); // Wait for client insert to complete
        console.log("Record inserted to client table.");
    } catch (error) {
        console.error('Error inserting records:', error);
        throw error; // Rethrow the error for handling at a higher level if needed
    }
}


app.post('/insert-OfficerToDatabase', async (req, res) => {
    try{
    const officerInfo = {
      userID: req.body.uID,
      officerID: req.body.oID,
      uName: req.body.uName,
      uPass: req.body.uPass,
      secPhrase: req.body.secPhrase,
      fullName: req.body.fName,
      phoneNum: req.body.phNo,
      email: req.body.email,
      DOB: req.body.DOB,
      address: req.body.address,
      hiredDate: req.body.hiredDate,
      salary: req.body.salary,
      position: req.body.position,
      ethAddress: req.body.ethAddress,
    };
    console.log(officerInfo);

     //Store user information into server
     await storeOfficerInfo(officerInfo.userID, officerInfo.officerID, officerInfo.uName, 
        officerInfo.uPass, officerInfo.secPhrase, officerInfo.fullName, officerInfo.phoneNum, 
        officerInfo.email, officerInfo.address, officerInfo.DOB, officerInfo.hiredDate, officerInfo.salary, 
        officerInfo.position, officerInfo.ethAddress, res);
  
      res.send({ message: 'Officer registered successfully!' });
    } catch (error) {
      console.error('Error registering officer:', error);
      res.status(500).send({ error: 'Registration failed. Please try again.' });
    }
  });
  
  async function storeOfficerInfo(
    uID,
    oID,
    uName,
    uPass,
    secPhrase,
    fullName,
    phoneNo,
    email,
    address,
    DOB,
    hiredDate,
    salary,
    position,
    ethAddress
  ) {
    const officerPass = '0';
    const userVals = [uID, uName, uPass, secPhrase, fullName, phoneNo, email, address, DOB];
    const officerVals = [oID, uID, hiredDate, salary, position];
    const ethAccVals = [ethAddress, officerPass, oID];
  
    const Uquery =
      'INSERT INTO `user` (`userID`, `username`, `password`, `secPhrase`, `name`, `phoneNo`, `email`, `address`, `dateofbirth`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);';
    const Oquery =
      'INSERT INTO `complianceofficer` (`officerID`, `userID`, `hiredDate`, `salary`, `position`) VALUES (?, ?, ?, ?, ?);';
    const Equery = 'INSERT INTO `ethaccount`(`ethAddress`, `password`, `officerID`) VALUES (?, ?, ?);';
  
    // Insert data into user table
    await queryAsync(Uquery, userVals);
  
    // Insert data into officer table
    await queryAsync(Oquery, officerVals);
  
    // Insert data into ethaccount table
    await queryAsync(Equery, ethAccVals);
  
    console.log('Officer registration completed.');
  }
  
  // Utility function to promisify MySQL queries
  function queryAsync(query, values) {
    return new Promise((resolve, reject) => {
      pool.query(query, values, (error) => {
        if (error) {
          console.error('Database query error:', error);
          reject(error);
        } else {
          console.log('Database query successful.');
          resolve();
        }
      });
    });
  }
  


async function createBankAccount(accNo, cID, balance, accStatus, accType, ethAddress) {
    const bankAccVals = [accNo, cID, balance, accStatus, accType, ethAddress];
    const Bquery = 'INSERT INTO `bankaccount` (`accNo`, `clientID`, `balance`, `accStatus`, `accType`, `ethAddress`) VALUES (?, ?, ?, ?, ?, ?);';
    
    pool.query(Bquery, bankAccVals, (error) => {
        if (error) {
            console.error('Error inserting records:', error);
            throw error;
        }
        console.log("Record inserted to bankaccount table.");
    });    
}


//get client profile info
app.get('/getProfile', (req, res) => {
    const token = req.header('Authorization');
    console.log('Token is:', token);

    if (!token) {
        return res.status(401).json({ error: 'There is no token.' });
    }

    jwt.verify(token.split(' ')[1], secretKey, (err, decoded) => {
        if (err) {
            console.error('Token failed:', err.message);
            return res.status(401).json({ error: 'Token is invalid.' });
        }

        const requestUserID = req.query.userID;
        console.log("The requested userID is ", requestUserID);
        const userID = requestUserID || decoded.userID;
        const username = decoded.username;
        console.log('UserID is:', userID);
        console.log('Username is:', username);

        const query = 'SELECT U.userID, C.clientID, U.username, U.password, U.secPhrase, U.name, U.phoneNo, U.email, U.address, U.dateofbirth, C.accStatus, C.riskScore FROM `user` U JOIN `client` C ON U.userID = C.userID WHERE U.userID = ?;';

        pool.query(query, [userID], (err, results) => {
            if (err) {
                console.error('Error querying profile details:', err);
                return res.status(500).json({ error: 'Error querying profile details.' });
            }

            console.log("Retrieved profile details from user and client table.");
            if (results.length > 0) {
                const profileInfo = {
                    userID: results[0].userID,
                    clientID: results[0].clientID,
                    username: results[0].username,
                    password: results[0].password,
                    secPhrase: results[0].secPhrase,
                    name: results[0].name,
                    phoneNo: results[0].phoneNo,
                    email: results[0].email,
                    address: results[0].address,
                    DOB: results[0].dateofbirth,
                    accStatus: results[0].accStatus,
                    riskScore: results[0].riskScore,
                };

                console.log("Client details are: ", profileInfo);
                return res.json({ profileInfo });
            } else {
                console.log("This user does not exist.");
                return res.json({ profileInfo: null });
            }
        });
    });
});

//update client profile
app.post('/updateProfile', async (req, res) => {
    const updatedInfo = {
        uID: req.body.uID,
        uPass: req.body.uPass,
        fullName: req.body.fName,
        phoneNum: req.body.phNo,
        email: req.body.email,
        address: req.body.address,
    };
    console.log(updatedInfo);

    if ('riskScore' in req.body) {
        updatedInfo.riskScore = req.body.riskScore;
    }

    let query;
    let updatedVals;
    if ('riskScore' in updatedInfo) {
        //include riskScore in query
        query = 'UPDATE `user` U JOIN `client` C ON U.userID = C.userID SET U.password = ?, U.name = ?, U.phoneNo = ?, U.email = ?, U.address = ?, C.riskScore = ? WHERE U.userID = ?;';
        updatedVals = [updatedInfo.uPass, updatedInfo.fullName, updatedInfo.phoneNum, updatedInfo.email, updatedInfo.address, updatedInfo.riskScore, updatedInfo.uID];
    } else {
        //exclude riskScore in query
        query = 'UPDATE `user` SET `password`=?,`name`= ?,`phoneNo`= ?,`email`= ?, `address`= ? WHERE userID = ?;';
        updatedVals = [updatedInfo.uPass, updatedInfo.fullName, updatedInfo.phoneNum, updatedInfo.email, updatedInfo.address, updatedInfo.uID];
    }
    console.log("Going to insert:", updatedVals);

    pool.query(query, updatedVals, (err) => {
        if (err) {
            console.error('Error updating user records:', err);
            return res.status(500).json({ error: 'Error updating user records.' });
        }
        console.log("Records updated in user table.");
    })
    res.send({ message: 'User updated successfully!' });
});

//client upload appeals
app.post("/uploadAppeal", upload.single("file"), function (req, res) {
    const token = req.header('Authorization');
    console.log('Token is:', token);

    if (!token) {
        return res.status(401).json({ error: 'There is no token.' });
    }

    jwt.verify(token.split(' ')[1], secretKey, (err, decoded) => {
        if (err) {
            console.error('Token failed:', err.message);
            return res.status(401).json({ error: 'Token is invalid.' });
        }

        const appealID = 'AP' + (Math.floor(Math.random() * 90000) + 10000);
        const clientID = decoded.clientID;
        const description = req.body.description;
        const appealDate = req.body.date;
        const filename = req.file.filename;
        const appealStat = "PENDING";

        const values = [appealID, clientID, description, appealDate, filename, appealStat];
        const query = "INSERT INTO `appeals` (`appealID`, `clientID`, `description`, `appealDate`, `filename`, `appealStat`) VALUES (?, ?, ?, ?, ?, ?);";

        pool.query(query, values, (err) => {
            if (err) {
                console.error("Error inserting data:", err);
                return res.status(500).json({ message: "Error submitting appeal." });
            }

            res.json({ message: "Appeal uploaded successfully." });
            console.log("Appeal stored successfully.");
        });
    });
});

//get all Appeals
app.get('/getAppeals', (req, res) => {
    const token = req.header('Authorization');
    console.log('Token is:', token);

    if (!token) {
        return res.status(401).json({ error: 'There is no token.' });
    }

    jwt.verify(token.split(' ')[1], secretKey, (err, decoded) => {
        if (err) {
            console.error('Token failed:', err.message);
            return res.status(401).json({ error: 'Token is invalid.' });
        }

        const userID = decoded.userID;
        const officerID = decoded.officerID;
        const username = decoded.username;
        console.log('UserID is:', userID);
        console.log('OfficerID is:', officerID);
        console.log('Username is:', username);

        const query = 'SELECT * FROM `appeals` WHERE appealStat = "PENDING";';

        pool.query(query, (err, results) => {
            if (err) {
                console.error('Error querying pending appeals:', err);
                return res.status(500).json({ error: 'Error querying pending appeals.' });
            }

            console.log("Retrieved appeals.");
            const appeals = [];

            if (results.length > 0) {
                results.forEach((appeal) => {
                    const appealID = appeal.appealID;
                    const clientID = appeal.clientID;
                    const description = appeal.description;
                    const appealDate = appeal.appealDate;
                    const filename = appeal.filename;
                    const appealStat = appeal.appealStat;
                    appeals.push({ appealID, clientID, description, appealDate, filename, appealStat });
                });

                console.log(appeals);
                return res.json({ appeals });
            } else {
                console.log("No officers.");
                return res.json({
                    appealID: null,
                    clientID: null,
                    description: null,
                    appealDate: null,
                    filename: null,
                    appealStat: null,
                });
            }
        });
    });
});

//display appeal details
app.post('/getAppealDetail', (req, res) => {
    const token = req.header('Authorization');
    console.log('Token is:', token);

    if (!token) {
        return res.status(401).json({ error: 'There is no token.' });
    }

    jwt.verify(token.split(' ')[1], secretKey, (err, decoded) => {
        if (err) {
            console.error('Token failed:', err.message);
            return res.status(401).json({ error: 'Token is invalid.' });
        }

        const requestAppealID = req.body.appealID;
        console.log("The requested AppealID is ", requestAppealID);
        const username = decoded.username;
        console.log('Username is:', username);

        const query = 'SELECT A.*, C.accStatus, C.riskScore, C.isBlacklisted, U.username, U.name, U.phoneNo, U.email FROM `appeals` A JOIN `client` C ON A.`clientID` = C.`clientID` JOIN `user` U ON C.userID = U.userID WHERE A.`appealID` = ?;';

        pool.query(query, [requestAppealID], (err, results) => {
            if (err) {
                console.error('Error querying appeal details:', err);
                return res.status(500).json({ error: 'Error querying appeal details.' });
            }

            console.log("Retrieved appeal details.");

            if (results.length > 0) {
                const appeal = {
                    appealID: results[0].appealID,
                    clientID: results[0].clientID,
                    description: results[0].description,
                    appealDate: results[0].appealDate,
                    filename: results[0].filename,
                    appealStat: results[0].appealStat,
                    accStatus: results[0].accStatus,
                    riskScore: results[0].riskScore,
                    isBlacklisted: results[0].isBlacklisted,
                    username: results[0].username,
                    name: results[0].name,
                    phoneNo: results[0].phoneNo,
                    email: results[0].email,
                };

                console.log("Appeal details are: ", appeal);
                return res.json({ appeal });
            } else {
                console.log("This appeal does not exist.");
                return res.json({ appeal: null });
            }
        });
    });
});

//update appeal
app.post('/updateAppeal', (req, res) => {
    const token = req.header('Authorization');
    console.log('Token is:', token);

    if (!token) {
        return res.status(401).json({ error: 'There is no token.' });
    }

    jwt.verify(token.split(' ')[1], secretKey, (err, decoded) => {
        if (err) {
            console.error('Token failed:', err.message);
            return res.status(401).json({ error: 'Token is invalid.' });
        }

        const requestAppealID = req.body.appealID;
        const status = req.body.status;
        console.log("The requested AppealID is ", requestAppealID);
        const username = decoded.username;
        console.log('Username is:', username);

        const query = 'UPDATE `appeals` SET `appealStat`= ? WHERE `appealID`= ?;';

        pool.query(query, [status, requestAppealID], (err) => {
            if (err) {
                console.error('Error querying appeal details:', err);
                return res.status(500).json({ error: 'Error querying appeal details.' });
            }else{
                console.log("Updated appeal details.");
                res.json({ message: "Appeal updated successfully." });
            }
        });
    });
});

//display Officer profile details
app.get('/getOProfile', (req, res) => {
    const token = req.header('Authorization');
    console.log('Token is:', token);

    if (!token) {
        return res.status(401).json({ error: 'There is no token.' });
    }

    jwt.verify(token.split(' ')[1], secretKey, (err, decoded) => {
        if (err) {
            console.error('Token failed:', err.message);
            return res.status(401).json({ error: 'Token is invalid.' });
        }

        const requestOfficerID = req.query.officerID;
        console.log("The requested OfficerID is ", requestOfficerID);
        const officerID = requestOfficerID || decoded.officerID;
        const username = decoded.username;
        console.log('OfficerID is:', officerID);
        console.log('Username is:', username);

        const query = 'SELECT U.userID, O.officerID, U.username, U.password, U.secPhrase, U.name, U.phoneNo, U.email, U.address, U.dateofbirth, O.hiredDate, O.salary, O.position FROM `user` U JOIN `complianceofficer` O ON U.userID = O.userID WHERE O.officerID = ?;';

        pool.query(query, [officerID], (err, results) => {
            if (err) {
                console.error('Error querying profile details:', err);
                return res.status(500).json({ error: 'Error querying profile details.' });
            }

            console.log("Retrieved profile details from user and officer table.");
            if (results.length > 0) {
                const profileInfo = {
                    userID: results[0].userID,
                    officerID: results[0].officerID,
                    username: results[0].username,
                    password: results[0].password,
                    secPhrase: results[0].secPhrase,
                    name: results[0].name,
                    phoneNo: results[0].phoneNo,
                    email: results[0].email,
                    address: results[0].address,
                    DOB: results[0].dateofbirth,
                    hiredDate: results[0].hiredDate,
                    salary: results[0].salary,
                    position: results[0].position,
                };

                console.log("Officer details are: ", profileInfo);
                return res.json({ profileInfo });
            } else {
                console.log("This employee does not exist.");
                return res.json({ profileInfo: null });
            }
        });
    });
});

app.post('/updateOProfile', async (req, res) => {
    const updatedInfo = {
        uID: req.body.uID,
        uPass: req.body.uPass,
        fullName: req.body.fName,
        phoneNum: req.body.phNo,
        email: req.body.email,
        address: req.body.address,
        salary: req.body.salary,
        position: req.body.position,
    };

    const query1 = 'UPDATE `user` SET `password`=?,`name`= ?,`phoneNo`= ?,`email`= ?, `address` = ? WHERE userID = ?;';
    const query2 = 'UPDATE `complianceofficer` SET `salary`=?, `position`= ? WHERE userID = ?;';
    const updatedVals1 = [updatedInfo.uPass, updatedInfo.fullName, updatedInfo.phoneNum, updatedInfo.email, updatedInfo.address, updatedInfo.uID];
    const updatedVals2 = [updatedInfo.salary, updatedInfo.position, updatedInfo.uID];

    pool.query(query1, updatedVals1, (err1) => {
        if (err1) {
            console.error('Error updating user table:', err1);
            return res.status(500).json({ message: 'Error updating user table.' });
        }
        console.log('Records updated in user table.');

        pool.query(query2, updatedVals2, (err2) => {
            if (err2) {
                console.error('Error updating compliance officer table:', err2);
                return res.status(500).json({ message: 'Error updating compliance officer table.' });
            }
            console.log('Records updated in compliance officer table.');

            res.json({ message: 'Data updated successfully.' });
        });
    });
});

//display user details
app.get('/users', (req, res) => {
    const token = req.header('Authorization');
    console.log('Token is:', token);

    if (!token) {
        return res.status(401).json({ error: 'There is no token.' });
    }

    jwt.verify(token.split(' ')[1], secretKey, (err, decoded) => {
        if (err) {
            console.error('Token failed:', err.message);
            return res.status(401).json({ error: 'Token is invalid.' });
        }

        const userID = decoded.userID;
        const officerID = decoded.officerID;
        const username = decoded.username;
        console.log('UserID is:', userID);
        console.log('OfficerID is:', officerID);
        console.log('Username is:', username);

        const query = "SELECT U.userID, C.clientID, U.username, U.password, U.secPhrase, U.name, U.phoneNo, U.email, U.address, U.dateofbirth, C.accStatus, C.riskScore FROM `user` U JOIN `client` C ON U.userID = C.userID ORDER BY C.riskScore DESC;";

        pool.query(query, (err, results) => {
            if (err) {
                console.error('Error querying clients:', err);
                return res.status(500).json({ error: 'Error querying clients.' });
            }

            console.log("Retrieved clients.");
            const clients = [];

            if (results.length > 0) {
                results.forEach((client) => {
                    const userID = client.userID;
                    const clientID = client.clientID;
                    const fullName = client.name;
                    const phoneNo = client.phoneNo;
                    const email = client.email;
                    const riskScore = client.riskScore;
                    clients.push({ userID, clientID, fullName, phoneNo, email, riskScore });
                });

                console.log(clients);
                return res.json({ clients });
            } else {
                console.log("No users.");
                return res.json({
                    userID: null,
                    clientID: null,
                    fullName: null,
                    phoneNo: null,
                    email: null,
                    riskScore: null,
                });
            }
        });
    });
});

app.post('/deactivateUser', async (req, res) => {
    const userID = req.query.userID;
    console.log("The userIS is ", userID);
  
      const query = 'UPDATE `client` C JOIN `user` U ON C.userID = U.userID SET C.accStatus = "DEACTIVATED" WHERE U.userID = ?;';

      pool.query(query, [userID], (err) => {
        if (err) {
            console.error('Error querying clients:', err);
            return res.status(500).json({ error: 'Error querying clients.' });
        }
    })
  });

//error handling
app.get("/:universalURL", (req, res) => {
    res.send("404 URL NOT FOUND");
});