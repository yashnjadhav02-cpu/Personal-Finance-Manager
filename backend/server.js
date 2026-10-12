const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());


// Test route
app.get("/", (req, res) => {
    res.send("Personal Finance Manager Backend is running!");
});


// REGISTER
app.post("/api/register", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users (username, password)
            VALUES (?, ?)
        `;

        db.query(sql, [username, hashedPassword], (err, result) => {
            if (err) {
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        message: "Username already exists"
                    });
                }

                console.error(err);

                return res.status(500).json({
                    message: "Database error"
                });
            }

            res.status(201).json({
                message: "Registration successful",
                userId: result.insertId
            });
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// LOGIN
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            message: "Username and password are required"
        });
    }

    const sql = `
        SELECT * FROM users
        WHERE username = ?
    `;

    db.query(sql, [username], async (err, results) => {
        if (err) {
            console.error(err);

            return res.status(500).json({
                message: "Database error"
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        const user = results[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        res.json({
            message: "Login successful",
            userId: user.id,
            username: user.username
        });
    });
});
// GET ALL TRANSACTIONS FOR A USER
app.get("/api/transactions/:userId", (req, res) => {
    const userId = req.params.userId;

    const sql = `
        SELECT
            id,
            type,
            amount,
            category,
            transaction_date AS date,
            description
        FROM transactions
        WHERE user_id = ?
        ORDER BY transaction_date DESC, id DESC
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                message: "Database error"
            });
        }

        res.json(results);
    });
});


// ADD TRANSACTION
app.post("/api/transactions", (req, res) => {
    const {
        userId,
        type,
        amount,
        category,
        date,
        description
    } = req.body;

    if (!userId || !type || !amount || !category || !date) {
        return res.status(400).json({
            message: "Required transaction details are missing"
        });
    }

    const sql = `
        INSERT INTO transactions
        (user_id, type, amount, category, transaction_date, description)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [userId, type, amount, category, date, description || null],
        (err, result) => {
            if (err) {
                console.error(err);

                return res.status(500).json({
                    message: "Database error"
                });
            }

            res.status(201).json({
                message: "Transaction added successfully",
                transactionId: result.insertId
            });
        }
    );
});


// UPDATE TRANSACTION
app.put("/api/transactions/:id", (req, res) => {
    const transactionId = req.params.id;

    const {
        userId,
        type,
        amount,
        category,
        date,
        description
    } = req.body;

    const sql = `
        UPDATE transactions
        SET
            type = ?,
            amount = ?,
            category = ?,
            transaction_date = ?,
            description = ?
        WHERE id = ? AND user_id = ?
    `;

    db.query(
        sql,
        [
            type,
            amount,
            category,
            date,
            description || null,
            transactionId,
            userId
        ],
        (err, result) => {
            if (err) {
                console.error(err);

                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Transaction not found"
                });
            }

            res.json({
                message: "Transaction updated successfully"
            });
        }
    );
});


// DELETE TRANSACTION
app.delete("/api/transactions/:id", (req, res) => {
    const transactionId = req.params.id;
    const userId = req.body.userId;

    const sql = `
        DELETE FROM transactions
        WHERE id = ? AND user_id = ?
    `;

    db.query(
        sql,
        [transactionId, userId],
        (err, result) => {
            if (err) {
                console.error(err);

                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Transaction not found"
                });
            }

            res.json({
                message: "Transaction deleted successfully"
            });
        }
    );
});
// GET CURRENT MONTH'S BUDGET
app.get("/api/budget/:userId", (req, res) => {
    const userId = req.params.userId;

    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    const sql = `
        SELECT amount
        FROM budgets
        WHERE user_id = ? AND month = ? AND year = ?
    `;

    db.query(sql, [userId, month, year], (err, results) => {
        if (err) {
            console.error(err);

            return res.status(500).json({
                message: "Database error"
            });
        }

        if (results.length === 0) {
            return res.json({
                amount: 0
            });
        }

        res.json({
            amount: Number(results[0].amount)
        });
    });
});


// SET CURRENT MONTH'S BUDGET
app.post("/api/budget", (req, res) => {
    const { userId, amount } = req.body;

    if (!userId || !amount || Number(amount) <= 0) {
        return res.status(400).json({
            message: "Valid user ID and budget amount are required"
        });
    }

    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    const sql = `
        INSERT INTO budgets (user_id, amount, month, year)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE amount = VALUES(amount)
    `;

    db.query(
        sql,
        [userId, amount, month, year],
        (err) => {
            if (err) {
                console.error(err);

                return res.status(500).json({
                    message: "Database error"
                });
            }

            res.json({
                message: "Budget saved successfully"
            });
        }
    );
});
// START SERVER
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});