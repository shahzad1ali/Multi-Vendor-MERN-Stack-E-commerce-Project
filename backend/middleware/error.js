const ErrorHandler = require("../utils/ErrorHandler");

module.exports = (err,req,res,next) => {
    err.statusCode = err.statusCode || 500
    err.message = err.message || "Internal Server Error"

    //Wrong Mongodb id error
    if (err.name === "CastError") {
        const message = `Resources not found with this id.. Invalid ${err.path}`;
        err= new ErrorHandler(message,400);
    }

    //Duplicate key error
    if (err.code === 11000) {
        const message = `Duplicate key ${Object.keys(err.keyValue)} Entered`;
        err = new ErrorHandler(message, 400)

    }

    //Wrong jwt error
    if (err.name === "jsonWebTokenError") {
        const message = `Your url is Invalid please try again latter`;
        err = new ErrorHandler(message,400)
    }

    // jwt expired
    if (err.name === "TokenExpiredError") {
        const message = `Your url is Expired please try again latter`;
        err = new ErrorHandler(message,400)
    }

    res.status(err.statusCode).json({
        success: false,
        message: err.message,
    });
};