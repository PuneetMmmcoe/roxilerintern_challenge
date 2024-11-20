const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();


const app = express();


app.use(
  cors({
    origin: "http://localhost:3001",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.use(express.json());


const MONGODB_URI = process.env.MONGODB_URI ;


const transactionSchema = new mongoose.Schema({
  id: Number,
  title: String,
  price: Number,
  description: String,
  category: String,
  sold: Boolean,
  dateOfSale: Date,
});


const Transaction = mongoose.model("Transaction", transactionSchema);


// Transactions API
app.get("/api/transactions", async (req, res) => {
  try {
    const { month, search, page = 1, perPage = 10 } = req.query;
    const skip = (page - 1) * perPage;


    let query = {};


    if (month) {
      // Use 2022 as the year since that's when the data is from
      const startDate = new Date(2022, parseInt(month) - 1, 1);
      const endDate = new Date(2022, parseInt(month), 0);


      query.dateOfSale = {
        $gte: startDate,
        $lte: endDate,
      };
    }


    if (search) {
      const searchRegex = new RegExp(search, "i");
      const numSearch = !isNaN(search) ? Number(search) : null;


      query.$or = [{ title: searchRegex }, { description: searchRegex }];


      if (numSearch !== null) {
        query.$or.push({ price: numSearch });
      }
    }


    const transactions = await Transaction.find(query)
      .skip(skip)
      .limit(parseInt(perPage));


    const total = await Transaction.countDocuments(query);


    res.json({
      transactions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Statistics API
app.get("/api/statistics", async (req, res) => {
  try {
    const { month } = req.query;


    // Use 2022 for the year
    const startDate = new Date(2022, parseInt(month) - 1, 1);
    const endDate = new Date(2022, parseInt(month), 0);


    const monthMatch = {
      dateOfSale: {
        $gte: startDate,
        $lte: endDate,
      },
    };


    const [totalSales] = await Transaction.aggregate([
      { $match: monthMatch },
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]);


    const soldItems = await Transaction.countDocuments({
      ...monthMatch,
      sold: true,
    });


    const notSoldItems = await Transaction.countDocuments({
      ...monthMatch,
      sold: false,
    });


    res.json({
      totalSaleAmount: totalSales?.total || 0,
      totalSoldItems: soldItems,
      totalNotSoldItems: notSoldItems,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Bar Chart API
app.get("/api/bar-chart", async (req, res) => {
  try {
    const { month } = req.query;


    // Use 2022 for the year
    const startDate = new Date(2022, parseInt(month) - 1, 1);
    const endDate = new Date(2022, parseInt(month), 0);


    const matchStage = {
      dateOfSale: {
        $gte: startDate,
        $lte: endDate,
      },
    };


    const ranges = [
      { min: 0, max: 100 },
      { min: 101, max: 200 },
      { min: 201, max: 300 },
      { min: 301, max: 400 },
      { min: 401, max: 500 },
      { min: 501, max: 600 },
      { min: 601, max: 700 },
      { min: 701, max: 800 },
      { min: 801, max: 900 },
      { min: 901, max: Infinity },
    ];


    const result = await Promise.all(
      ranges.map(async ({ min, max }) => {
        const count = await Transaction.countDocuments({
          ...matchStage,
          price: {
            $gte: min,
            $lt: max === Infinity ? Number.MAX_VALUE : max,
          },
        });


        return {
          range: `${min}-${max === Infinity ? "above" : max}`,
          count,
        };
      })
    );


    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Pie Chart API
app.get("/api/pie-chart", async (req, res) => {
  try {
    const { month } = req.query;


    // Use 2022 for the year
    const startDate = new Date(2022, parseInt(month) - 1, 1);
    const endDate = new Date(2022, parseInt(month), 0);


    const categories = await Transaction.aggregate([
      {
        $match: {
          dateOfSale: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);


    res.json(
      categories.map((cat) => ({
        category: cat._id,
        count: cat.count,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Combined API
app.get("/api/combined-data", async (req, res) => {
  try {
    const { month } = req.query;
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`;


    const [statistics, barChart, pieChart] = await Promise.all([
      axios.get(`${baseUrl}/api/statistics?month=${month}`),
      axios.get(`${baseUrl}/api/bar-chart?month=${month}`),
      axios.get(`${baseUrl}/api/pie-chart?month=${month}`),
    ]);


    res.json({
      statistics: statistics.data,
      barChart: barChart.data,
      pieChart: pieChart.data,
    });
  } catch (error) {
    console.error("Combined data error:", error);
    res.status(500).json({ error: "Failed to fetch combined data" });
  }
});


// Database initialization remains the same
async function initializeDatabase() {
  try {
    const existingCount = await Transaction.countDocuments();


    if (existingCount === 0) {
      console.log("Initializing database...");
      const response = await axios.get(
        "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
      );
      const transactions = response.data;


      await Transaction.insertMany(
        transactions.map((t) => ({
          ...t,
          dateOfSale: new Date(t.dateOfSale),
        }))
      );
      console.log("Database initialized successfully");
    } else {
      console.log(
        "Database already contains data:",
        existingCount,
        "documents"
      );
    }
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}


mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    return initializeDatabase();
  })
  .catch((err) => console.error("MongoDB connection error:", err));


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



