const mongoose = require("mongoose");

// const connectDatabase = () => {
//     mongoose.connect(process.env.DB_URL, {
//         useNewUrlParser: true,
//         useUnifiedTopology: true,
//     }).then((data) => {
//         console.log(`mongod connected with server: ${data.connection.host}`)
//     })
// }

// module.exports = connectDatabase;

mongoose.set("strictPopulate", false);
const connectDbWithRetry = async (dbURI, maxRetries) => {
  for (let retries = 0; retries < maxRetries; retries++) {
    try {
      const uri =
        // process.env.NODE_ENV === "test" ? await getMemoryServerUri() : dbURI;   Todo change it
        dbURI;
      await mongoose.connect(uri, {
        dbName: "Ecommerce",
        connectTimeoutMS: 20000,
      });
      console.log("Connected to MongoDB");

      break;
    } catch (err) {
      console.log("Failed to connect to MongoDB");
      if (retries === maxRetries) {
        console.error("Max connection retries reached.");
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

 const connectDatabase = async () => {
    console.log("db url", process.env.DB_URL)
  await connectDbWithRetry(process.env.DB_URL, 10);
};

 module.exports = connectDatabase;
