
// const { log } = require("console");
// const  app = require("./app");
// const connectDatabase = require("./db/Database");



// //Handling uncaught exception
// process.on("uncaughtException", (err) => {
//     console.log(`Error: ${err.message}`);
//     console.log(`shoting down the server for handling uncaught exeption`); 
    
// })

// //config
// if (process.env.NODE_ENV !== "PRODUCTION") {
//     require ("dotenv").config({
//         path:"config/.env"
//     });
// }

// // connect db
// connectDatabase();

// //create server
// const server = app.listen(process.env.PORT, () => {
// console.log(`server is running on http://localhost:${process.env.PORT} `);

// })

// // unhandled promise rejection 
// process.on("unhandledRejection", (err) => {
//     console.log(`shoting down the server for ${err.message}`);
//     console.log(`shoting down the server for unhandled promise rejection`);

//     server.close(() => {
//         process.exit(1);
//     });
// });