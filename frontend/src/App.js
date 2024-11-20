import React, { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(3); // Default to March as per requirements
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize state with empty arrays/objects to prevent undefined errors
  const [transactions, setTransactions] = useState([]);
  const [statistics, setStatistics] = useState({
    totalSaleAmount: 0,
    totalSoldItems: 0,
    totalNotSoldItems: 0,
  });
  const [barChartData, setBarChartData] = useState([]);
  const [pieChartData, setPieChartData] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = "http://localhost:3000";

      const [transactionsRes, combinedRes] = await Promise.all([
        fetch(
          `${baseUrl}/api/transactions?month=${selectedMonth}&search=${searchText}&page=${page}`
        ),
        fetch(`${baseUrl}/api/combined-data?month=${selectedMonth}`),
      ]);

      if (!transactionsRes.ok) {
        throw new Error(
          `Transactions API error: ${transactionsRes.statusText}`
        );
      }
      if (!combinedRes.ok) {
        throw new Error(`Combined data API error: ${combinedRes.statusText}`);
      }

      const transactionsData = await transactionsRes.json();
      const combinedData = await combinedRes.json();

      if (transactionsData.error) {
        throw new Error(transactionsData.error);
      }
      if (combinedData.error) {
        throw new Error(combinedData.error);
      }

      setTransactions(transactionsData.transactions || []);
      setTotalPages(transactionsData.totalPages || 1);
      setStatistics(
        combinedData.statistics || {
          totalSaleAmount: 0,
          totalSoldItems: 0,
          totalNotSoldItems: 0,
        }
      );
      setBarChartData(combinedData.barChart || []);
      setPieChartData(combinedData.pieChart || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(
        error.message ||
          "Failed to fetch data. Please check if the backend server is running."
      );
      // Reset data states on error
      setTransactions([]);
      setStatistics({
        totalSaleAmount: 0,
        totalSoldItems: 0,
        totalNotSoldItems: 0,
      });
      setBarChartData([]);
      setPieChartData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, searchText, page]);

  // Add useEffect to trigger data fetching
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) {
        setPage(1); // Reset to first page when search changes
      } else {
        fetchData();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  const handleMonthChange = (e) => {
    setSelectedMonth(Number(e.target.value));
    setPage(1); // Reset to first page when month changes
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <select
          className="border p-2 rounded"
          value={selectedMonth}
          onChange={handleMonthChange}
        >
          {MONTHS.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search transactions..."
          className="border p-2 rounded flex-1"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : error ? (
        <div className="text-red-500 text-center py-4">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-100 rounded">
              <h3 className="font-bold">Total Sale Amount</h3>
              <p>${statistics.totalSaleAmount?.toFixed(2) || "0.00"}</p>
            </div>
            <div className="p-4 bg-green-100 rounded">
              <h3 className="font-bold">Total Sold Items</h3>
              <p>{statistics.totalSoldItems || 0}</p>
            </div>
            <div className="p-4 bg-yellow-100 rounded">
              <h3 className="font-bold">Total Not Sold Items</h3>
              <p>{statistics.totalNotSoldItems || 0}</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">Transactions</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border">
                <thead>
                  <tr>
                    <th className="p-2 border">ID</th>
                    <th className="p-2 border">Title</th>
                    <th className="p-2 border">Description</th>
                    <th className="p-2 border">Price</th>
                    <th className="p-2 border">Category</th>
                    <th className="p-2 border">Sold</th>
                    <th className="p-2 border">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length > 0 ? (
                    transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="p-2 border">{transaction.id}</td>
                        <td className="p-2 border">{transaction.title}</td>
                        <td className="p-2 border">
                          {transaction.description}
                        </td>
                        <td className="p-2 border">${transaction.price}</td>
                        <td className="p-2 border">{transaction.category}</td>
                        <td className="p-2 border">
                          {transaction.sold ? "Yes" : "No"}
                        </td>
                        <td className="p-2 border">
                          {new Date(
                            transaction.dateOfSale
                          ).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="p-4 text-center">
                        No transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-bold mb-4">
                Price Range Distribution
              </h2>
              {barChartData.length > 0 ? (
                <BarChart width={500} height={300} data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              ) : (
                <p>No price range data available</p>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4">
                Categories Distribution
              </h2>
              {pieChartData.length > 0 ? (
                <PieChart width={500} height={300}>
                  <Pie
                    data={pieChartData}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : (
                <p>No category data available</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;


