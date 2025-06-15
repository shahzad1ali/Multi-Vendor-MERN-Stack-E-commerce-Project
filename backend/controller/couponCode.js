const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const Shop = require("../model/shop");
const Event = require("../model/event");
const ErrorHandler = require("../utils/ErrorHandler");
const { isSeller } = require("../middleware/auth");
const CouponCode = require("../model/couponCode")
const router = express.Router();



// create coupon code
router.post("/create-coupon-code", isSeller, catchAsyncErrors(async (req, res, next) => {
    try {
        const existingCoupon = await CouponCode.findOne({ name: req.body.name });

        if (existingCoupon) {
            return next(new ErrorHandler("Coupon Code already exists!", 400));
        }

        const couponData = {
            name: req.body.name,
            value: req.body.value,
            minAmount: req.body.minAmount,
            maxAmount: req.body.maxAmount,
            shop: req.body.shopId, // Ensure this is correct
            selectedProduct: req.body.selectedProducts
        };

        const couponCode = await CouponCode.create(couponData);

        res.status(201).json({
            success: true,
            couponCode,
        });
    } catch (error) {
        return next(new ErrorHandler(error.message || error, 400));
    }
}));

// get all coupons of a shop
router.get(
  "/get-coupon/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const couponCodes = await CouponCode.find({ shop: { _id: req.params.id } });

      res.status(200).json({
        success: true,
        couponCodes,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || error, 400));
    }
  })
);

// get coupon code value by its name
router.get("/get-coupon-value/:name", catchAsyncErrors(async (req, res, next) => {
  try {
    const couponCode = await CouponCode.findOne({name: req.params.name});

    res.status(200).json({
      success: true,
      couponCode,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message || error, 400));

  }
}))

module.exports = router;