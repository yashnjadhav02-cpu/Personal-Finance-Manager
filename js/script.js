const API_URL = "https://personal-finance-manager-z8z1.onrender.com/api";
const userId = localStorage.getItem("userId");
const loggedInUser = document.getElementById("logged-in-user");
const username = localStorage.getItem("username");

if (loggedInUser && username) {
    loggedInUser.textContent = "Logged in as: " + username;
}

if (!userId) {
    window.location.href = "loginpage.html";
}
// Get the form
const form = document.getElementById("transaction-form");

// Get dashboard elements
const totalIncomeElement = document.getElementById("total-income");
const totalExpensesElement = document.getElementById("total-expenses");
const balanceElement = document.getElementById("balance");
const savingsElement = document.getElementById("savings");
const savingsPercentageElement = document.getElementById("savings-percentage");
const transactionCountElement =
    document.getElementById("transaction-count");

// Get transaction list
const transactionList = document.getElementById("transaction-list");

// Transactions loaded from MySQL
let transactions = [];
let editingIndex = -1;


// Budget elements
const budgetInput = document.getElementById("budget-input");
const setBudgetButton = document.getElementById("set-budget-btn");

const budgetAmountElement = document.getElementById("budget-amount");
const budgetSpentElement = document.getElementById("budget-spent");
const budgetRemainingElement = document.getElementById("budget-remaining");
const budgetMessageElement = document.getElementById("budget-message");

// Budget loaded from MySQL
let monthlyBudget = 0;
// Add transaction
form.addEventListener("submit", async function (event) { 

    event.preventDefault();

    const type = document.getElementById("type").value;
    const amount = Number(document.getElementById("amount").value);
    const category = document.getElementById("category").value;
    const date = document.getElementById("date").value;
    const description = document.getElementById("description").value;

    const transaction = {
        id: Date.now(),
        type: type,
        amount: amount,
        category: category,
        date: date,
        description: description
    };

    if (editingIndex === -1) {
    // Add transaction to MySQL
    try {
        const response = await fetch(`${API_URL}/transactions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userId: userId,
                type: type,
                amount: amount,
                category: category,
                date: date,
                description: description
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Failed to add transaction.");
            return;
        }

        await loadTransactions();

    } catch (error) {
        console.error(error);
        alert("Could not connect to the backend.");
        return;
    }

}  else {
    // Update transaction in MySQL
    const transaction = transactions[editingIndex];

    try {
        const response = await fetch(`${API_URL}/transactions/${transaction.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userId: userId,
                type: type,
                amount: amount,
                category: category,
                date: date,
                description: description
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Failed to update transaction.");
            return;
        }

        editingIndex = -1;

        await loadTransactions();

    } catch (error) {
        console.error(error);
        alert("Could not connect to the backend.");
        return;
    }
}




updateDashboard();
displayTransactions();
updateBudget();
updateExpenseAnalysis();
updateCharts();
updateReports();

form.reset();

form.querySelector("button").textContent = "Add Transaction";
});
// Load transactions from MySQL
async function loadTransactions() {
    try {
        const response = await fetch(`${API_URL}/transactions/${userId}`);

        if (!response.ok) {
            throw new Error("Failed to load transactions");
        }

        transactions = await response.json();

        // Make sure amounts are numbers
        transactions.forEach(function (transaction) {
            transaction.amount = Number(transaction.amount);
        });

        updateDashboard();
        displayTransactions();
        updateBudget();
        updateExpenseAnalysis();
        updateCharts();
        updateReports();

    } catch (error) {
        console.error("Error loading transactions:", error);
        alert("Could not load transactions from the database.");
    }
}

// Save transactions
function saveTransactions() {
    localStorage.setItem("transactions", JSON.stringify(transactions));
}


// Update dashboard
function updateDashboard() {

    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach(function (transaction) {

        if (transaction.type === "income") {
            totalIncome += transaction.amount;
        }

        if (transaction.type === "expense") {
            totalExpenses += transaction.amount;
        }
    });

    const balance = totalIncome - totalExpenses;

    totalIncomeElement.textContent = "₹" + totalIncome;
    totalExpensesElement.textContent = "₹" + totalExpenses;
    balanceElement.textContent = "₹" + balance;
    savingsElement.textContent = "₹" + balance;
    let savingsPercentage = 0;

if (totalIncome > 0) {
    savingsPercentage = (balance / totalIncome) * 100;
}

savingsPercentageElement.textContent =
    savingsPercentage.toFixed(1) + "% of income";
    transactionCountElement.textContent = transactions.length;
}


// Display transactions
function displayTransactions() {

    transactionList.innerHTML = "";

    if (transactions.length === 0) {
        transactionList.innerHTML = "<p>No transactions yet.</p>";
        return;
    }

    transactions.forEach(function (transaction, index)  {

        const transactionElement = document.createElement("div");

        transactionElement.classList.add("transaction");

        const sign = transaction.type === "income" ? "+" : "-";

        transactionElement.innerHTML = `
            <div class="transaction-info">
                <strong>${transaction.category}</strong>
                <span>${transaction.description || "No description"}</span>
                <br>
                <small>${transaction.date}</small>
            </div>

            <div>
                <span class="${transaction.type}">
                    ${sign} ₹${transaction.amount}
                </span>

                <button
    onclick="editTransaction(${index})">
    Edit
</button>

<button
    class="delete-btn"
    onclick="deleteTransaction(${index})">
    Delete
</button>
            </div>
        `;

        transactionList.appendChild(transactionElement);
    });
}
// Set monthly budget
setBudgetButton.addEventListener("click", async function () {

    const budget = Number(budgetInput.value);

    if (budget <= 0) {
        alert("Please enter a valid budget.");
        return;
    }

    try {
    const response = await fetch(`${API_URL}/budget`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            userId: userId,
            amount: budget
        })
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.message || "Failed to save budget.");
        return;
    }

    monthlyBudget = budget;

    budgetInput.value = "";

    updateBudget();

} catch (error) {
    console.error(error);
    alert("Could not connect to the backend.");
}
});

// Delete transaction
async function deleteTransaction(index) {

    const transaction = transactions[index];

    if (!transaction) {
        return;
    }

    const confirmed = confirm("Are you sure you want to delete this transaction?");

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/transactions/${transaction.id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userId: userId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Failed to delete transaction.");
            return;
        }

        await loadTransactions();

    } catch (error) {
        console.error(error);
        alert("Could not connect to the backend.");
    }
}
// Edit transaction
function editTransaction(index) {

    const transaction = transactions[index];

    document.getElementById("type").value = transaction.type;
    document.getElementById("amount").value = transaction.amount;
    document.getElementById("category").value = transaction.category;
    document.getElementById("date").value = transaction.date;
    document.getElementById("description").value = transaction.description;

    editingIndex = index;

    form.querySelector("button").textContent = "Update Transaction";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}
// Load budget from MySQL
async function loadBudget() {
    try {
        const response = await fetch(`${API_URL}/budget/${userId}`);

        if (!response.ok) {
            throw new Error("Failed to load budget");
        }

        const data = await response.json();

        monthlyBudget = Number(data.amount) || 0;

        updateBudget();

    } catch (error) {
        console.error("Error loading budget:", error);
        alert("Could not load budget from the database.");
    }
}
// Update budget
function updateBudget() {

    let totalSpent = 0;

    transactions.forEach(function (transaction) {

        if (transaction.type === "expense") {
            totalSpent += transaction.amount;
        }

    });

    const remaining = monthlyBudget - totalSpent;

    budgetAmountElement.textContent = "₹" + monthlyBudget;
    budgetSpentElement.textContent = "₹" + totalSpent;
    budgetRemainingElement.textContent = "₹" + remaining;

    if (monthlyBudget === 0) {

        budgetMessageElement.textContent =
            "Please set your monthly budget.";

    } else if (totalSpent > monthlyBudget) {

        budgetMessageElement.textContent =
            "⚠️ You have exceeded your monthly budget!";

    } else if (totalSpent >= monthlyBudget * 0.8) {

        budgetMessageElement.textContent =
            "⚠️ You have used 80% or more of your budget.";

    } else {

        budgetMessageElement.textContent =
            "You are within your budget.";

    }
}

// Update expense analysis
function updateExpenseAnalysis() {

    const expenseAnalysis = document.getElementById("expense-analysis");

    let categoryTotals = {};
    let totalExpenses = 0;

    transactions.forEach(function (transaction) {

        if (transaction.type === "expense") {

            totalExpenses += transaction.amount;

            if (!categoryTotals[transaction.category]) {
                categoryTotals[transaction.category] = 0;
            }

            categoryTotals[transaction.category] += transaction.amount;
        }

    });

    expenseAnalysis.innerHTML = "";

    if (Object.keys(categoryTotals).length === 0) {

        expenseAnalysis.innerHTML =
            "<p>No expense data available.</p>";

        return;
    }

    for (let category in categoryTotals) {

        const percentage =
            (categoryTotals[category] / totalExpenses) * 100;

        const categoryElement = document.createElement("div");

        categoryElement.classList.add("expense-category");

        categoryElement.innerHTML = `
    <strong>${category}</strong>

    <span>
        ₹${categoryTotals[category]}
        (${percentage.toFixed(1)}%)
    </span>

    <div class="expense-bar">
        <div class="expense-bar-fill" style="width: ${percentage}%"></div>
    </div>
`;

        expenseAnalysis.appendChild(categoryElement);
    }
}

// Update financial charts
function updateCharts() {

    let totalIncome = 0;
    let totalExpenses = 0;
    let categoryTotals = {};

    transactions.forEach(function (transaction) {

        if (transaction.type === "income") {
            totalIncome += transaction.amount;
        }

        if (transaction.type === "expense") {

            totalExpenses += transaction.amount;

            if (!categoryTotals[transaction.category]) {
                categoryTotals[transaction.category] = 0;
            }

            categoryTotals[transaction.category] += transaction.amount;
        }
    });


    // Income and expense amounts

    document.getElementById("chart-income").textContent =
        "₹" + totalIncome;

    document.getElementById("chart-expenses").textContent =
        "₹" + totalExpenses;


    // Chart bar widths

    const total = totalIncome + totalExpenses;

    let incomeWidth = 0;
    let expenseWidth = 0;

    if (total > 0) {
        incomeWidth = (totalIncome / total) * 100;
        expenseWidth = (totalExpenses / total) * 100;
    }

    document.getElementById("income-bar").style.width =
        incomeWidth + "%";

    document.getElementById("expense-bar").style.width =
        expenseWidth + "%";


    // Expenses by category

    const categoryChart =
        document.getElementById("category-chart");

    categoryChart.innerHTML = "";

    if (Object.keys(categoryTotals).length === 0) {

        categoryChart.innerHTML =
            "<p>No expense data available.</p>";

        return;
    }

    for (let category in categoryTotals) {

        const amount = categoryTotals[category];

        const categoryElement =
            document.createElement("div");

        categoryElement.classList.add("category-chart-item");

        categoryElement.innerHTML = `
            <div class="category-chart-header">
                <strong>${category}</strong>
                <span>₹${amount}</span>
            </div>

            <div class="category-bar">
                <div
                    class="category-bar-fill"
                    style="width: ${(amount / totalExpenses) * 100}%">
                </div>
            </div>
        `;

        categoryChart.appendChild(categoryElement);
    }
}


// Update financial reports
function updateReports() {

    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach(function (transaction) {

        if (transaction.type === "income") {
            totalIncome += transaction.amount;
        }

        if (transaction.type === "expense") {
            totalExpenses += transaction.amount;
        }
    });

    const balance = totalIncome - totalExpenses;


    document.getElementById("report-income").textContent =
        "₹" + totalIncome;

    document.getElementById("report-expenses").textContent =
        "₹" + totalExpenses;

    document.getElementById("report-balance").textContent =
        "₹" + balance;

    document.getElementById("report-transactions").textContent =
        transactions.length;


    const summary =
        document.getElementById("report-summary-text");

    if (transactions.length === 0) {

        summary.textContent =
            "No transactions available for the report.";

    } else {

        summary.textContent =
            "You have earned ₹" + totalIncome +
            " and spent ₹" + totalExpenses +
            ". Your current balance is ₹" + balance + ".";
    }
}

// Load data when page opens
loadTransactions();
loadBudget();
const logoutButton = document.getElementById("logout-btn");

logoutButton.addEventListener("click", function () {
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    window.location.href = "loginpage.html";
});
const userDisplay = document.getElementById("logged-in-user");

if (userDisplay) {
    const currentUsername = localStorage.getItem("username") || "User";
    userDisplay.textContent = "Logged in as: " + currentUsername;
}