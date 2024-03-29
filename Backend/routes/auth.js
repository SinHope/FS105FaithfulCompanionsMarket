import express from "express";
import User from "../models/User.js"; // Import the User model
import Item from "../models/Item.js"; // Import the Item model
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer"; // Import multer for image upload
import path from "path";
import crypto from "crypto";
import nodemailer from "nodemailer";
import cors from "cors";
import Dog from "../models/dog.js";
import Cat from "../models/cat.js";
import birds from "../data/birdpage.js";
import Bird from "../models/bird.js";
import Fish from "../models/fish.js";
import Accessories from "../models/accessories.js";
import Petfood from "../models/petfood.js";
import Cart from "../models/cart.js";
import Stripe from "stripe";
import { fileURLToPath } from "url";

const stripe = new Stripe(
  "sk_test_51OmE8VEkckOis0EQXB3upH0jrRQ8XuPi4fRAcaaJnKbjpnrRGbc0TxZfDTaAYH5k0F3Ak9YjOgXh4shyDsbg0UkZ000pieUmyG"
);

// Creating __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const router = express.Router();
const app = express();
// Enable CORS
app.use(cors());



// Below is for profile page. Will call this data at my router.get below
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Set up multer for local file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads/"));
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });


// Register User
router.post("/register", async (req, res) => {
  console.log("Received data:", req.body);
  const { name, email, password, role } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({
      email,
    });

    if (user) {
      return res.status(400).json({
        message: "Account user already exists",
      });
    }

    // Create a new user
    user = new User({
      name,
      email,
      password,
      isActivated: false,
      role,
    });

    // Generate a token for email activation
    const token = jwt.sign(
      { userId: user._id, email: user.email }, // Include email in the token payload
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Set token and token expiry time for the user
    user.token = token;
    user.tokenExpires = new Date(Date.now() + 3600000); // Token expires in 1 hour

    // Save the user to the database
    await user.save();

    const activationLink = `http://localhost:5000/api/auth/activate?token=${token}`;
    const imageURL = "https://i.ibb.co/0Kd17XY/fcmlogo.jpg";
    console.log("auth link 1 \n" + activationLink);
    // Send activation email
    try {
      await sendActivationEmail(user.email, activationLink, imageURL);
      res
        .status(201)
        .json({
          message: "Account user created successfully. Activation email sent.",
        });
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      res
        .status(500)
        .json({
          message: "User registered, but failed to send activation email.",
        });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

async function sendActivationEmail(email, activationLink, imageURL) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_ADDRESS,
      pass: process.env.EMAIL_PASSWORD, // see .env file
    },
  });
  const mailOptions = {
    from: process.env.EMAIL_ADDRESS,
    to: email,
    subject: "Account Activation",
    html: `<div style="font-family: Arial, sans-serif; color: #333;">
        <h1 style="color: #555;">Account Activation</h1>
        <p style="color: #666;">Please click on the following link to activate your account :</p>
        <a href="${activationLink}" style="background-color: #0046ff; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Activate account</a>
        <p style="margin-top: 20px;">Or copy and paste this URL into your browser:</p>
        <p><a href="${activationLink}" style="color: #0046ff;">${activationLink}</a></p>
        <p style="color: #666;">Let"s paw now with your wings and fins and bring heaven to your loved pets</p>
        <p><em>Paw Regards</em></p>
        <p><em>The Faithful Companion Market Team</em></p>
        <img src="${imageURL}" alt="Your Brand Image" style="width: 100px; height: 100px;">
      </div>`,
  };

  return transporter.sendMail(mailOptions);
}

//For the activation link
router.get("/activate", async (req, res) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).send("User not found.");
    }

    if (user.isActivated) {
      return res.status(400).send("Account already activated.");
    }

    user.isActivated = true; // Change the isActivated field from false to true to indicated acccount activated
    user.token = null; // Clear the token after activation
    user.tokenExpires = null; // Clear the token expiry time after activation
    await user.save();

    res.send(
      "<div style='text-align: center; margin-top: 25%; background: linear-gradient(135deg, #FFA500, #FFD700); '><p style='font-size: 18px; font-weight: 600;'>Account activated successfully! If your browser doesn't redirect you in 5 seconds, please click the following <a href='http://localhost:3000/login'>link</a>.</p></div>"
    );
  } catch (error) {
    res.status(500).send("Error activating account.");
  }
});

// Login User
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    // Check if the account has been activated
    if (!user.isActivated) {
      return res
        .status(401)
        .json({
          message:
            "Account not activated. Please check your email to activate your account.",
        });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: user.role,
      message: "Login successful",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Below to read the user data from database in MongoDB, so that render correct profile page

router.get("/ProfilePage", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching user data",
    });
  }
});

// Send password reset email
router.post("/reset-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Generate a token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpire = Date.now() + 3600000; // 1 hour from now

    if (user) {
      // Save the token and its expiry to the user"s record
      user.resetToken = resetToken;
      user.resetTokenExpire = resetTokenExpire;
      await user.save();

      // TODO: Send an email to the user with the reset link
      // The link should be something like "https://yourfrontenddomain.com/reset-password?token=" + resetToken
      // You can use nodemailer or any other email library to send the email

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_ADDRESS,
          pass: process.env.EMAIL_PASSWORD, // see .env file
        },
      });

      const resetLink = `http://localhost:3000/setnewpassword?token=${resetToken}`;

      const imageURL = "https://i.ibb.co/0Kd17XY/fcmlogo.jpg";

      const mailOptions = {
        from: process.env.EMAIL_ADDRESS,
        to: user.email,
        subject: "Password Reset Link",
        html: `<div style="font-family: Arial, sans-serif; color: #333;">
              <h1 style="color: #555;">Reset Your Password</h1>
              <p style="color: #666;">Please click on the following link to reset your password:</p>
              <a href="${resetLink}" style="background-color: #0046ff; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
              <p style="margin-top: 20px;">Or copy and paste this URL into your browser:</p>
              <p><a href="${resetLink}" style="color: #0046ff;">${resetLink}</a></p>
              <p><em>Paw Regards</em></p>
              <p><em>The Faithful Companion Market Team</em></p>
              <img src="${imageURL}" alt="Your Brand Image" style="width: 100px; height: 100px;">
            </div>`,
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
          res.status(500).send("Error in sending email");
        } else {
          console.log("Email sent: " + info.response);
          res.status(200).send("Password reset email sent.");
        }
      });
    }

    // Respond with a generic message
    res
      .status(200)
      .send(
        "If a user with that email exists, we have sent them a password reset email."
      );
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing request");
  }
});

// For users to set up the new password
router.post("/setnewpassword", async (req, res) => {
  try {
    const { token } = req.query;
    console.log("Received token:", token);
    const { password } = req.body;
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpire: { $gt: Date.now() },
    });

    console.log("User found:", user);

    if (!user) {
      return res.status(400).send("Invalid or expired token");
    }

    // Update the user"s password and clear the reset token fields
    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;
    await user.save();

    res.send("Password has been reset successfully");
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).send("Error resetting password");
  }
});

// Below is for users to edit their password
router.post("/change-password", authenticateToken, async (req, res) => {
  const { newPassword,email } = req.body;
  
  if (!newPassword) {
    return res.status(400).send("New password is required");
  }

  try {
    const user = await User.findOne({ email });
    console.log("Found user:", user);

    if (!user) {
      return res.status(404).send("User not found");
    }

    user.password = newPassword;  
    await user.save();

    res.send("Password updated successfully");
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).send("Error updating password" + error.message);
  }
});

// Below is for users to delete their account

router.delete("/delete-account", authenticateToken, async (req, res) => {
  try {
    // Assuming the user's email is stored in req.user.email
    const { email } = req.body;;

    // Delete the user by email
    const deletedUser = await User.findOneAndDelete({ email });

    if (!deletedUser) {
      return res.status(404).send("User not found");
    }
    res.send("Account deleted successfully");
  } catch (error) {
    console.error("Error deleting account", error);
    res.status(500).send("Error deleting account: " + error.message);
  }
});

// Below is a post method for the uploading of the image to be registered unto the user"s profile page
router.post(
  "/uploads",
  authenticateToken,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      console.log("Received file:", req.file);
      // req.file is the uploaded file
      // Get only the relative path
      const relativeImagePath = path.join(
        "uploads",
        path.basename(req.file.path)
      ).replace(/\\/g, "\"");
      
      const userEmail = req.user.email;

      // Update the user"s profile to include the relative image file path
      const user = await User.findOneAndUpdate(
        {
          email: userEmail
        },
        {
          profileImagePath: relativeImagePath,
        },
        {
          new: true,
        }
      );
      console.log("Updated user profile with image path:", user);
      res.json(user);
    } catch (error) {
      console.error("Error in /uploads endpoint:", error);
      res.status(500).json({
        message: "Error uploading image",
      });
    }
  }
);

// GET route for serving images
router.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const dir = path.join(__dirname, '../uploads');
  const filePath = path.join(dir, filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});



// Add an item without image upload
router.post("/admin/add-item", upload.single("image"), async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      species,
      availability,
      price,
      rating,
      numReviews,
    } = req.body;

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    // Check for required fields
    if (
      !name ||
      !description ||
      !category ||
      !species ||
      !availability ||
      !price ||
      !rating ||
      !numReviews
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if the submitted category is valid
    if (!["pets", "toys"].includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const newItem = new Item({
      name,
      description,
      category,
      species,
      availability,
      price,
      rating,
      numReviews,
      imageUrl,
    });

    await newItem.save();
    res.status(201).json({ message: "Item added successfully" });
  } catch (error) {
    console.error("Item addition error: ", error);
    res
      .status(500)
      .json({
        message: "Error occurred during item addition",
        error: error.message,
      });
  }
});

// Define the route to handle file uploads using the router
router.post(
  "/profile-upload-single",
  upload.single("image"),
  function (req, res, next) {
    // Handle the uploaded file here
    console.log(JSON.stringify(req.file));
    var response = "<a href=" / ">Home</a><br>";
    response += "File uploaded successfully.<br>";
    response += `<img src="${req.file.name}" /><br>`;
    return res.send(response);
  }
);

// Register the router with your app
app.use("/", router);

router.get("/admin/get-items", async (req, res) => {
  try {
    // Fetch all items from the database
    const items = await Item.find({});
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});
router.delete("/admin/delete-item/:itemId", async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const deletedItem = await Item.findByIdAndDelete(itemId);

    if (!deletedItem) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

router.put("/admin/edit-item/:id", async (req, res) => {
  try {
    const { name, description, stock, price } = req.body;
    const itemId = req.params.id;

    if (!name || !description || !stock || !price) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const updatedItem = await Item.findByIdAndUpdate(
      itemId,
      {
        name,
        description,
        stock,
        price,
      },
      { new: true } // Return the updated item
    );

    if (!updatedItem) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.status(200).json(updatedItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to edit item" });
  }
});

//-------------for item page------------------------------
router.get("/cats", async (req, res) => {
  try {
    // Fetch all dogs using your preferred method (Mongoose example)
    const cats = await Cat.find({});
    res.json(cats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching cats" });
  }
});
router.get("/cats/:id", async (req, res) => {
  try {
    const cat = await Cat.findById(req.params.id);
    if (!cat) {
      return res.status(404).json({ message: "cats not found" });
    }
    res.json(cat);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error fetching cats details",
        error: error.toString(),
      });
  }
});

router.get("/dogs", async (req, res) => {
  try {
    // Fetch all dogs using your preferred method (Mongoose example)
    const dogs = await Dog.find({});
    res.json(dogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching dogs" });
  }
});
// Get dog details by _id
router.get("/dogs/:id", async (req, res) => {
  try {
    const dog = await Dog.findById(req.params.id);
    if (!dog) {
      return res.status(404).json({ message: "Dog not found" });
    }
    res.json(dog);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching dog details", error: error.toString() });
  }
});

router.get("/birds", async (req, res) => {
  try {
    // Fetch all dogs using your preferred method (Mongoose example)
    const birds = await Bird.find({});
    res.json(birds);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching birds" });
  }
});
router.get("/birds/:id", async (req, res) => {
  try {
    const bird = await Bird.findById(req.params.id);
    if (!bird) {
      return res.status(404).json({ message: "birds not found" });
    }
    res.json(bird);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error fetching birds details",
        error: error.toString(),
      });
  }
});

router.get("/fishes", async (req, res) => {
  try {
    // Fetch all dogs using your preferred method (Mongoose example)
    const fishes = await Fish.find({});
    res.json(fishes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching fishes" });
  }
});
router.get("/fishes/:id", async (req, res) => {
  try {
    const fish = await Fish.findById(req.params.id);
    if (!fish) {
      return res.status(404).json({ message: "fishes not found" });
    }
    res.json(fish);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error fetching fishes details",
        error: error.toString(),
      });
  }
});

router.get("/accessories", async (req, res) => {
  try {
    // Fetch all dogs using your preferred method (Mongoose example)
    const accessories = await Accessories.find({});
    res.json(accessories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching accessories" });
  }
});
router.get("/accessories/:id", async (req, res) => {
  try {
    const accessory = await Accessories.findById(req.params.id);
    if (!accessory) {
      return res.status(404).json({ message: "accessories not found" });
    }
    res.json(accessory);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error fetching accessories details",
        error: error.toString(),
      });
  }
});

router.get("/petfoods", async (req, res) => {
  try {
    // Fetch all dogs using your preferred method (Mongoose example)
    const petfood = await Petfood.find({});
    res.json(petfood);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching petfood" });
  }
});
router.get("/petfoods/:id", async (req, res) => {
  try {
    const petfood = await Petfood.findById(req.params.id);
    if (!petfood) {
      return res.status(404).json({ message: "petfoods not found" });
    }
    res.json(petfood);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error fetching petfoods details",
        error: error.toString(),
      });
  }
});

//----CART --------------------
router.post("/cart/add", async (req, res) => {
  // Extract userName, productId, and quantity from request body
  const { userName, item } = req.body;

  try {
    // Find the user"s cart
    let cart = await Cart.findOne({ userName });

    // If the cart doesn"t exist, create a new one
    if (!cart) {
      cart = new Cart({ userName, cartItems: [] });
    }

    // Check if the item is already in the cart
    const existingItem = cart.cartItems.find(
      (cartItem) => cartItem.productId.toString() === item._id
    );

    // If the item exists, update its quantity
    if (existingItem) {
      existingItem.quantity = item.qty;
    } else {
      // Otherwise, add a new item to the cart
      cart.cartItems.push({ productId: item._id, quantity: item.qty });
    }

    // Save the updated cart to the database
    const updatedCart = await cart.save();

    res.json(updatedCart);
  } catch (error) {
    console.error("Error adding item to cart:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/cart/update", async (req, res) => {
  const { cartItems } = req.body;

  try {
    // Find the user"s cart in the database and update it with the new cartItems
    const updatedCart = await Cart.findOneAndUpdate(
      { userId: req.user._id }, // Assuming you have authentication middleware that adds req.user
      { cartItems },
      { new: true }
    );

    if (!updatedCart) {
      // If the user doesn"t have a cart yet, create one
      const newCart = await Cart.create({ userId: req.user._id, cartItems });
      res.json(newCart);
    } else {
      res.json(updatedCart);
    }
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Remove item from cart
router.delete("/cart/remove", async (req, res) => {
  // Extract userId and itemId from request
  const { userId, itemId } = req.body;

  try {
    // Remove item from user"s cart in the database
    const updatedCart = await Cart.findOneAndUpdate(
      { userId },
      { $pull: { cartItems: { _id: itemId } } },
      { new: true }
    );
    res.json(updatedCart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get user"s cart
router.get("/cart/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Find user"s cart in the database
    const cart = await Cart.findOne({ userId });
    res.json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// router.post("/create-checkout-session", async (req, res) => {
//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ["card"],
//     line_items: [{
//       price_data: {
//         currency: "sgd",
//         product_data: {
//           name: "Dog",
//         },
//         unit_amount: 2000,
//       },
//       quantity: 1,
//     }],
//     mode: "payment",
//     success_url: "http://localhost:4242/success",
//     cancel_url: "http://localhost:4242/cancel",
//   });

//   res.json({ url: session.url });
// });
router.post("/create-checkout-session", async (req, res) => {
  const { items } = req.body; // Assuming you"re now sending items from the frontend

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: items.map((item) => ({
        price_data: {
          currency: "sgd",
          product_data: {
            name: item.name,
          },
          // Convert price to the smallest unit (e.g., cents) and ensure it"s an integer
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      success_url: "http://localhost:3000/successpage?payment=success",
      cancel_url: "http://localhost:3000/cartpage",
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).send({ error: "Failed to create checkout session" });
  }
});

export default router;
