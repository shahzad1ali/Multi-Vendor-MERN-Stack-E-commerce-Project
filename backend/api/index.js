const express = require("express");
const ErrorHandler = require("../middleware/error");
const app = express();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const connectDatabase = require("../db/Database");

// Connect MongoDB
connectDatabase();

// Load environment variables
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({ path: "config/.env" });
}

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ["http://localhost:3000","https://multi-vendor-frontend-mocha.vercel.app"],
  credentials: true,
}));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Routes
const user = require("../controller/user");
const shop = require("../controller/shop");
const product = require("../controller/product");
const event = require("../controller/event");
const coupon = require("../controller/couponCode");
const payment = require("../controller/payment");
const order = require("../controller/order");
const conversation = require("../controller/conversation");
const message = require("../controller/message");
const withdraw = require("../controller/withdraw");

app.use("/api/v2/user", user);
app.use("/api/v2/shop", shop);
app.use("/api/v2/order", order);
app.use("/api/v2/product", product);
app.use("/api/v2/event", event);
app.use("/api/v2/coupon", coupon);
app.use("/api/v2/payment", payment);
app.use("/api/v2/conversation", conversation);
app.use("/api/v2/message", message);
app.use("/api/v2/withdraw", withdraw);

// Error middleware
app.use(ErrorHandler);

// Export the app (no app.listen)
module.exports = app;
