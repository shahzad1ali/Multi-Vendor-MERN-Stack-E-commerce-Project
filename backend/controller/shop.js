const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const Shop = require("../model/shop");
const sendMail = require("../utils/sendMail");
const sendToken = require("../utils/jwtToken");
const ErrorHandler = require("../utils/ErrorHandler");
const { upload } = require("../multer");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const sendShopToken = require("../utils/ShopToken");
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const { isSeller } = require("../middleware/auth");


// ========== Create Shop (Register) ==========
 
router.post(
  "/create-shop",
  upload.single("file"),
  async (req, res, next) => {
    try {
      const { name, email, password, address, phoneNumber, zipCode } = req.body;

      // Check if user already exists
      const existingSeller = await Shop.findOne({ email });
      if (existingSeller) {
        // Remove uploaded file if any
        if (req.file) {
          const filePath = `uploads/${req.file.filename}`;
          fs.unlink(filePath, (err) => {
            if (err) console.log("File deletion error:", err);
          });
        }
        return next(new ErrorHandler("User already exists", 400));
      }

      if (!req.file) {
        return next(new ErrorHandler("Avatar image is required", 400));
      }

      const avatar = {
        public_id: req.file.filename,
        url: `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`,
      };

      const seller = {
        name,
        email,
        password,
        avatar,
        address,
        phoneNumber,
        zipCode,
      };

      const activationToken = createActivationToken(seller);

      const activationUrl = `http://localhost:3000/seller/activation/${activationToken}`;

      await sendMail({
        email: seller.email,
        subject: "Activate your Shop",
        message: `Hello ${seller.name}, please click on the link to activate your shop: ${activationUrl}`,
      });

      res.status(201).json({
        success: true,
        message: `Please check your email: ${email} to activate your shop!`,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ========== Create Activation Token ==========

const createActivationToken = (seller) => {
  return jwt.sign(seller, process.env.ACTIVATION_SECRET, {
    expiresIn: '5m' // 1 day token validity
  });
};

// ========== Activate Shop Account ==========

router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { activation_token } = req.body;

      const newSeller = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );

      if (!newSeller) {
        return next(new ErrorHandler("Invalid or expired token", 400));
      }

      const { name, email, password, avatar, zipCode, address, phoneNumber } =
        newSeller;

      let seller = await Shop.findOne({ email });
      if (seller) {
        return next(new ErrorHandler("User already exists", 400));
      }

      // Now create the shop account (password will be hashed in pre-save hook)
      seller = await Shop.create({
        name,
        email,
        password,
        avatar,
        zipCode,
        address,
        phoneNumber,
      });

      sendShopToken(seller, 201, res); // Login immediately after activation
    } catch (error) {
      console.log("🚀 ~ catchAsyncErrors ~ error:", error)
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//Login Shop

router.post("/login-shop", catchAsyncErrors(async (req,res,next) => {
    try {
        const {email, password} = req.body;

        if (!email || !password){
            return next(new ErrorHandler("please provide all this fields!", 400));
        }

        const user = await Shop.findOne({email}).select("+password");
        console.log(user)

        if (!user) { 
            return next(new ErrorHandler("user doesn,t exist", 404));
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return next(new ErrorHandler("please provide the correct information", 400));
        }
        sendShopToken(user, 201, res); 

    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
        
    }
}));

// Get seller details
router.get(
  "/getSeller",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    const seller = await Shop.findById(req.seller._id);
 
    if (!seller) {
      return next(new ErrorHandler("User doesn't exist", 400));
    }

    res.status(200).json({
      success: true,
      seller,
    });
  })
);

//Log out shop

router.get("/logout", isAuthenticated, catchAsyncErrors(async (req,res,next) => {
    try {
      res.cookie("seller_token", null, {
       expires: new Date(Date.now()),
       httpOnly: true,
      });
      res.status(201).json({
        success: true,
        message: "Log out sucessfull"
      });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
}));

//get shop Info
router.get("/get-shop-info/:id",catchAsyncErrors(async(req,res,next) => {
  try {
    const shop = await Shop.findById(req.params.id);
    res.status(201).json({
      success: true,
      shop,
    });
  } catch (error) {
           return next(new ErrorHandler(error.message, 500));
  }
}));

// Update shop profile picture
router.put("/update-shop-avatar", isSeller, upload.single("image"), catchAsyncErrors(async (req, res, next) => {
    try {
        const existsUser = await Shop.findById(req.seller._id);

        const existAvatarPath = `uploads/${existsUser.avatar}`;

        fs.unlinkSync(existAvatarPath);

        const fileUrl = path.join(req.file.filename);

        const seller = await Shop.findByIdAndUpdate(req.seller._id, {
            avatar: fileUrl,
        });

        res.status(201).json({
            success: true,
            seller,
        })
    } catch (error) {
         return next(new ErrorHandler(error.message, 500));       
    }
}))


//update seller info
router.put("/update-seller-info", isAuthenticated, catchAsyncErrors(async (req, res, next) => {
    try {
        const { name, description, address,phoneNumber,zipCode } = req.body;

        const shop = await Shop.findOne(req.seller._id);

        if (!shop) {
            return next(new ErrorHandler("User not Found!", 400));
        } 

        shop.name = name;
        shop.description = description;
        shop.phoneNumber = phoneNumber;
        shop.address = address;
        shop.zipCode = zipCode;


        await shop.save();

        res.status(201).json({
            success: true,
            shop,
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
}));

//all seller for admin
router.get(
  "/admin-all-sellers",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const sellers = await Shop.find().sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        sellers,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete seller ---admin
router.delete(
  "/delete-seller/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.params.id);

      if (!seller) {
        return next(
          new ErrorHandler("Seller is not available with this id", 400)
        );
      }

      await Shop.findByIdAndDelete(req.params.id);

      res.status(201).json({
        success: true,
        message: "Seller deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//delete seller withdraw methods ---- only seller
router.delete("/delete-withdraw-method/:id", isSeller,catchAsyncErrors(async(req,res,next) => {
  try {
    const seller = await Shop.findById(req.seller._id);

    if (!seller) {
      return next(new ErrorHandler("seller could not found with this id", 400));

    }
       seller.withdrawMethod = null;

       await seller.save();

    res.status(201).json({
      success: true,
      seller,
    })
  } catch (error) {
          return next(new ErrorHandler(error.message, 500));
  }
}))


module.exports = router;
