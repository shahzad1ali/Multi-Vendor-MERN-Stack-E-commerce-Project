const express = require("express");
const path = require("path");
const User = require("../model/user")
const router = express.Router();
const {upload} = require("../multer");
const ErrorHandler = require("../utils/ErrorHandler"); 
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const sendToken = require("../utils/jwtToken");
const { isAuthenticated, isAdmin } = require('../middleware/auth'); 

 
    
router.post("/create-user",upload.single("file"), async (req,res,next)=>{

    const filename = req?.file?.filename;
    console.log(filename);
    const {name,email,password} = req.body;
    const userEmail = await User.findOne({email});

    if (userEmail) {
        const filename = req.file.filename;
        const filePath = `uploads/${filename}`;
        fs.unlink(filePath, (err) => {
            if (err) {
                console.log(err);
                res.status(500).json({ message: "Error deleting file" })
            }

        });
        return next(new ErrorHandler("user already exist", 400));
    }
   
    // const fileUrl = path.join(filename);
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${filename}`;
    console.log(fileUrl)
    const user = {
        name: name,
        email: email,
        password: password,
        avatar:{
            url:fileUrl
    }}

    const activationToken = createActivationToken(user);

        const activationUrl = `http://localhost:3000/activation/${activationToken}`;

        try {
            await sendMail({
                email: user.email,
                subject:"Activate your account",
                message:`Hello ${user.name}, Please click on the link to activate your account: ${activationUrl}`,
            })
            res.status(201).json({
                success: true,
                message: `please check your email:- ${user.email} to active your account`
            })
        } catch (error) {
            return next(new ErrorHandler(error.message, 500));
         
        }


     
    // Create New User
    // const newUser = await User.create(user);
    // res.status(201).json({
    //     success: true,
    //     newUser,
    // });
    
});

//Create activation token
const createActivationToken = (user) => {
    return jwt.sign(user, process.env.ACTIVATION_SECRET,{
        expiresIn: "5m",
    })
}

// activate user
router.post("/activation", catchAsyncErrors(async(req,res,next) => {
    try {
        const {activation_token} = req.body;

        const newUser = jwt.verify(activation_token, process.env.ACTIVATION_SECRET);

        if (!newUser) {
            return next(new ErrorHandler("Invalid token", 400));

        }
        const {name,email,password,avatar} = newUser;

        let user = await User.findOne({email});
 
        if (user) {
            return next(new ErrorHandler("User already exists", 400))
        }


        user = await User.create({
            name,
            email,
            avatar,
            password,
        });

        sendToken(user, 201, res)
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
        
    }
}))

// Login user

router.post("/login-user", catchAsyncErrors(async (req,res,next) => {
    try {
        const {email, password} = req.body;

        if (!email || !password){
            return next(new ErrorHandler("please provide all this fields!", 400));
        }

        const user = await User.findOne({email}).select("+password");
        console.log(user)

        if (!user) {
            return next(new ErrorHandler("user doesn,t exist", 404));
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return next(new ErrorHandler("please provide the correct information", 400));
        }
        sendToken(user, 201, res);

    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
        
    }
}));

// Load user
router.get("/getuser", isAuthenticated, catchAsyncErrors(async(req,res,next) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return next(new ErrorHandler("User doesn,t exists", 400));
        }
        res.status(200).json({
            success: true,
            user,
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
})
);

// Log out user
router.get("/logout", isAuthenticated, catchAsyncErrors(async (req,res,next) => {
    try {
      res.cookie("token", null, {
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
}))

// Update user info
router.put("/update-user-info", isAuthenticated, catchAsyncErrors(async (req, res, next) => {
    try {
        const { name, email, phoneNumber, password } = req.body;

        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            return next(new ErrorHandler("User not Found!", 400));
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return next(new ErrorHandler("Please provide the correct information", 400));
        }

        user.name = name;
        user.email = email;
        user.phoneNumber = phoneNumber;

        await user.save();

        res.status(201).json({
            success: true,
            user,
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
}));

// Update user avatar
router.put("/update-avatar", isAuthenticated, upload.single("image"), catchAsyncErrors(async (req, res, next) => {
    try {
        const existsUser = await User.findById(req.user.id);

        const existAvatarPath = `uploads/${existsUser.avatar}`;

        fs.unlinkSync(existAvatarPath);

        const fileUrl = path.join(req.file.filename);

        const user = await User.findByIdAndUpdate(req.user.id, {
            avatar: fileUrl,
        });

        res.status(201).json({
            success: true,
            user,
        })
    } catch (error) {
         return next(new ErrorHandler(error.message, 500));       
    }
}))

//update user addresses
router.put('/update-user-addresses', isAuthenticated, catchAsyncErrors(async(req,res,next) => {
    try {
        const user = await User.findById(req.user.id);

        const sameTypeAddress = user.addresses.find((address) => address.addressType === req.body.addressType);

        if (sameTypeAddress) {
            return next(new ErrorHandler(`${req.body.addressType} address already exists`));
        }

        const existsAddress = user.addresses.find(address => address._id === req.body._id);

        if (existsAddress) {
            Object.assign(existsAddress, req.body);
        } else {
            //add the new address to the array
            user.addresses.push(req.body);
        };

        await user.save();

        res.status(200).json({
            success: true,
            user,
        })
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));       

    }
}))

//delete user address
router.delete("/delete-user-address/:id",isAuthenticated, catchAsyncErrors (async (req, res, next) => {
    try {
        const userId = req.user._id;
        const addressId = req.params.id;

        await User.updateOne({
            _id: userId
        }, 
        {$pull: {addresses: {_id: addressId}}}
    );

    const user = await User.findById(userId);

    res.status(200).json({
        success: true,
        user,
    });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));       

    }
}))

// Update user password
router.put("/update-user-password", isAuthenticated, catchAsyncErrors(async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("+password");

    const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

    if (!isPasswordMatched) {
      return next(new ErrorHandler("Old Password is incorrect!", 400));
    }

    if (req.body.newPassword !== req.body.confirmPassword) {
      return next(new ErrorHandler("Password does not matched with each others!", 400));
    }

    user.password = req.body.newPassword;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully!"
    });

  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));


//find user information with the user id
router.get("/user-info/:id", catchAsyncErrors(async(req,res,next) => {
    try {
        const user = await User.findById(req.params.id);

        res.status(201).json({
            success: true,
            user,
        })
    } catch (error) {
    return next(new ErrorHandler(error.message, 500));        
    }
}))


//all seller for admin
router.get(
  "/admin-all-users",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const users = await User.find().sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        users,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete Users
// DELETE user by Admin
router.delete("/delete-user/:id", isAuthenticated, isAdmin("Admin"), catchAsyncErrors(async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id); // <-- FIXED

    if (!user) {
      return next(new ErrorHandler("User not found with this ID", 404));
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully!",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));


module.exports = router;