
const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { upload } = require("../multer");
const Shop = require("../model/shop");
const router = express.Router();
const Event = require("../model/event");
const ErrorHandler = require("../utils/ErrorHandler");
const event = require("../model/event");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth")
const fs = require("fs");


//create enent

router.post("/create-event", upload.array("images"), catchAsyncErrors(async (req, res, next) => {
  try {
    console.log("req.body:", req.body);
    console.log("req.files:", req.files);

    const shopId = req.body.shopId;
    if (!shopId) {
      return next(new ErrorHandler("shopId is required", 400));
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return next(new ErrorHandler("Shop ID is invalid!", 400));
    }

    const files = req.files || [];
    const imageUrls = files.map((file) => file.filename);

    const eventData = {
      ...req.body,
      images: imageUrls,
      shopId: shopId,
      shop: shop._id,
    };

    const newEvent = await Event.create(eventData);

    res.status(201).json({
      success: true,
      event: newEvent,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
}));

//get all events
router.get("/get-all-events",async (req,res,next) => {
  try {
    const events = await Event.find();
    res.status(201).json({
      success: true,
      events,
    })
  } catch (error) {
   return next(new ErrorHandler(error.message, 400));

  }
})



//get all Events of shop
router.get(
  "/get-all-events/:id", catchAsyncErrors(async (req, res, next) => {
    try {
      const events = await Event.find({shopId: req.params.id});
      console.log("events:", events);
       
      res.status(201).json({
        success: true,
        events,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
)

//delete event of  shop
router.delete("/delete-shop-event/:id", catchAsyncErrors(async(req,res,next) => {
  try {
    const productId = req.params.id; 

    const eventData = await Event.findById(productId);
   
       eventData.images.forEach((imageUrls) => {
         const filename = imageUrls;
         const filePath = `/uploads/${filename}`;
   
         fs.unlink(filePath, (err) => {
           if (err) {
             console.log(err);
           }
         })
       });
       const event = await Event.findByIdAndDelete(productId);

    if (!event) {
      return next(new ErrorHandler("Event not found with this id", 500));
    }

    res.status(201).json({
      success: true,
      message: "Event deleted successfully",
    })
  } catch (error) {
    return next(new ErrorHandler(error, 400));
  }
}));

// all events --- for admin
router.get(
  "/admin-all-events",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const events = await Event.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        events,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


module.exports = router;