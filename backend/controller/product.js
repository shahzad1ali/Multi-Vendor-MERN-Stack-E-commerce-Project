const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const Product = require("../model/product");
const Shop = require("../model/shop");
const Order = require("../model/order");
const { upload } = require("../multer");
const ErrorHandler = require("../utils/ErrorHandler");
const fs = require("fs");
const { isSeller, isAdmin, isAuthenticated } = require("../middleware/auth")



//create product
router.post("/create-product", upload.array("images"), catchAsyncErrors(async (req, res, next) => {

  console.log("req.body:", req.body);
console.log("req.files:", req.files);
  try {
    const shopId = req.body.shopId;
    if (!shopId) {
      return next(new ErrorHandler("shopId is required", 400));
    }
    console.log(shopId);
    
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return next(new ErrorHandler("Shop ID is invalid!", 400));
    }

    const files = req.files;
    const imageUrls = files.map((file) => file.filename);

    const productData = {
      ...req.body,
      images: imageUrls,
      shop,
    };
    const product = await Product.create(productData);
    console.log(product, productData)

    res.status(201).json({
      success: true,
      product,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
}));


//get all products of shop

router.get(
  "/get-all-products-shop/:id", catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find({shopId: req.params.id });
    
       
      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
)

//delete product of  shop

router.delete("/delete-shop-product/:id", isSeller, catchAsyncErrors(async(req,res,next) => {
  try {
    const productId = req.params.id;

    const productData = await Product.findById(productId);

    productData.images.forEach((imageUrls) => {
      const filename = imageUrls;
      const filePath = `/uploads/${filename}`;

      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(err);
          
        }
      })
    });
    const product = await Product.findByIdAndDelete(productId);

    if (!product) {
      return next(new ErrorHandler("product not found with this id", 500));
    }

    res.status(201).json({
      success: true,
      message: "Product deleted successfully",
    })
  } catch (error) {
    return next(new ErrorHandler(error, 400));
  }
}))

//get all products

router.get(
  "/get-all-products", catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({createdAt: -1});

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
)

// review for a product
router.put("/create-new-review", catchAsyncErrors(async(req,res,next) => {
  try {
    const {user,rating,comment,productId,orderId} = req.body;

    const product = await Product.findById(productId);

    const review = {
      user,
      rating,
      comment,
      productId,
    };

    const isReviewed = product.reviews.find(
      (rev) => rev.user._id === req.user._id
    );

    if (isReviewed) {
      product.reviews.forEach((rev) => {
        if(rev.user._id === req.user._id){
          (rev.rating = rating), (rev.comment = comment), (rev.user = user);
        }
      });
    } else{
      product.reviews.push(review);
    }

    let avg = 0;

    product.reviews.forEach((rev) => {
      avg += rev.rating;
    });

    product.ratings = avg / product.reviews.length;

    await product.save({validateBeforeSave: false});

    await Order.findByIdAndUpdate(
      orderId,
      { $set: {"cart.$[elem].isReviewed" : true}},
      { arrayFilters: [{ "elem._id": productId }], new: true}
    );

    res.status(200).json({
      success: true,
      message: "Reviwed Successfully!"
    })
  } catch (error) {
      return next(new ErrorHandler(error, 400));
    
  }
}))


// all products --- for admin
router.get(
  "/admin-all-products",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);



module.exports = router;
