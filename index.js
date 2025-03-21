const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
require('dotenv').config()
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt');
const app = express()
const port = 8000
const cors = require('cors')
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');


const jwt = require('jsonwebtoken')
// const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.7xouwts.mongodb.net/${process.env.DB_NAME}`

mongoose
    .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB!'))
    .catch((err) => console.error('Failed to connect to MongoDB:', err));

app.listen(port, () => {
    console.log('server is running on port ', port)
})
app.get('/', async (req, res) => {
    res.send('server is running on')
})
//collections
const User = require('./models/user')
const Task = require('./models/tasks')
const sendVerificationEmail = async (email, verificationToken) => {
    //create a nodemailer transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "joymahmud1265@gmail.com",
            pass: 'mumc sqth gmol xgwz'
        }
    })
    //compose the mail
    const mailOptions = {
        from: "E-com",
        to: email,
        subject: "Email verification",
        text: `Please click the following link to verify your email:http://192.168.2.143:8000/verify/${verificationToken}`
    }
    try {
        await transporter.sendMail(mailOptions)
    } catch (error) {
        console.log("Error sending the mail", error)
    }
}

const generateSecretKey = () => {
    const secretKey = crypto.randomBytes(32).toString('hex')
    //console.log(secretKey)
    return secretKey
}

const secretKey = generateSecretKey()
//cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
});
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'uploads', // Folder in Cloudinary
        format: async (req, file) => 'jpg', // File format
        public_id: (req, file) => Date.now(), // Unique name for the file
    },
});

const upload = multer({ storage });

// Upload Route
app.post('/upload', upload.single('file'), async (req, res) => {
    res.status(200).json({ url: req.file.path }); // Return the Cloudinary URL
});

app.post('/updateProfile', async (req, res) => {
    try {
        console.log('update request')
        const { userId, name, phone, address, holdingNo, profilePic } = req.body;

        // Find the user by ID and update the specified fields
        const updatedUser = await User.findByIdAndUpdate(
            userId, // Find user by userId
            {
                $set: { // Update these fields
                    name,
                    phone,
                    address,
                    holdingNo,
                    profilePic
                }
            },
            { new: true } // Return the updated user document
        );

        // Check if the user was found and updated
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Respond with the updated user data
        res.status(200).json({ message: 'User updated successfully', user: updatedUser });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Failed to update user', error });
    }

})

//api endpoints
app.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, address, holdingNo, familyMember, usualWasteType, } = req.body
        const saltRounds = 10; // Recommended value
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log(name, email, password, phone, address, holdingNo, familyMember, usualWasteType)
        // check the user is already registered
        const existingUser = await User.findOne({ phone })
        if (existingUser) {
            return res.status(400).json({ message: 'Account already exists' })
        }
        //create a new user
        const newUser = new User({ name, email, password: hashedPassword, phone, points: 0, address, holdingNo, familyMember, usualWasteType })
        //generate  a verification token
        //newUser.verificationToken = crypto.randomBytes(20).toString('hex')
        //save the user to database
        const savedUser = await newUser.save()

        const token = jwt.sign({ userId: newUser._id }, secretKey)
        res.status(200).json({
            user: {
                id: savedUser._id,
                name: savedUser.name,
                phone: savedUser.phone,
                email: savedUser.email,
                points: savedUser.points,
                address: savedUser.address,
                holdingNo: savedUser.holdingNo,
                familyMember: savedUser.familyMember,
                usualWasteType: savedUser.usualWasteType
            },
            token,
            message: 'Registration successful'
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Registration failed' })
    }
})

//verify token
app.get('/verify/:token', async (req, res) => {
    try {
        const token = req.params.token
        const user = await User.findOne({ verificationToken: token })
        if (!user) {
            return res.status(404).json({ message: "Invalid verification token" })
        }

        user.verified = true
        user.verificationToken = undefined
        await user.save()
        res.status(200).json({ message: "Email verified successfully" })
    } catch (error) {
        res.status(500).json({ message: "Email verification failed" })
    }
})
//login api
app.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body
        console.log(phone, password)
        const user = await User.findOne({ phone })
        console.log("login request")
        if (!user) {
            res.status(401).json({ message: "Invalid phone number" })
            return

        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({ message: "Invalid password" })
            return
        }
        //generate token
        const token = jwt.sign({ userId: user._id }, secretKey)
        res.status(200).json(
            {
                user: user,
                token: token
            }
        )
    } catch (error) {
        res.status(500).json({ message: "Login failed" })
    }
})
//add task
app.post('/addTask', async (req, res) => {
    try {
        const { userId, wasteType, time, date, points, rulesFollow } = req.body;

        // Validate input
        if (!userId || !wasteType) {
            return res.status(400).json({ message: 'User and Waste Type are required.' });
        }

        // Create a new task
        const newTask = new Task({
            user: userId,
            wasteType,
            time,
            date,
            points,
            rulesFollow: rulesFollow
        });

        // Save the task to the database
        const savedTask = await newTask.save();

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $inc: { points: points || 0 }, // Increment points by the task's points (default to 0 if not provided)
                $push: { tasks: savedTask._id } // Add the task ID to the tasks array
            },
            { new: true } // Return the updated user document
        );

        // Respond with success
        res.status(200).json({
            message: 'Task added successfully.',
            task: savedTask,
            user: updatedUser
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to add task.', error });
    }
});
//earn a gift api
app.post('/earn-gift', async (req, res) => {
    console.log('gift request')
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.points < 500) {
            return res.status(400).json({ message: 'Insufficient points' });
        }
        user.points -= 500;
        await user.save();
        console.log('gift request')
        res.status(200).json({ message: 'Gift earn successfully', points: user.points });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to earn gift' });
    }
});

//get all tasks 
app.get('/tasks', async (req, res) => {
    try {
        let { page = 1, limit = 10 } = req.query; // Default: page 1, limit 10

        page = parseInt(page);
        limit = parseInt(limit);

        if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
            return res.status(400).json({ message: "Invalid pagination parameters" });
        }

        const totalTasks = await Task.countDocuments(); // Count total documents
        const tasks = await Task.find()
            .populate('user', 'name email phone') // Populating user details
            .select('-__v') // Exclude __v field
            .skip((page - 1) * limit) // Skip previous pages
            .limit(limit); // Limit results per page

        res.status(200).json({
            totalTasks,
            totalPages: Math.ceil(totalTasks / limit),
            currentPage: page,
            tasks,
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching tasks", error: error.message });
    }
});


//get all users:
// app.get('/users', async (req, res) => {
//     try {
//         const users = await User.find().select('-password').populate({
//             path: 'tasks',
//             options: { limit: 3 }, // Limit tasks per user
//         }); // Populate tasks
//         res.status(200).json(users);
//     } catch (error) {
//         res.status(500).json({ message: "Error fetching users", error: error.message });
//     }
// });

//statistics
app.get('/stats', async (req, res) => {
    try {
        // Calculate total sum of points
        const totalPoints = await Task.aggregate([
            { $group: { _id: null, totalPoints: { $sum: "$points" } } }
        ]);

        // Get total number of tasks
        const totalTasks = await Task.countDocuments();
        const biodegradableTasks = await Task.countDocuments({ wasteType: "biodegradable" })
        const biodegradableWastePercentage = totalTasks > 0 ? Math.floor((biodegradableTasks / totalTasks) * 100) : 0

        // Get total number of users
        const totalUsers = await User.countDocuments();

        // Get the 3 most recent users (sorted by _id descending)
        const recentUsers = await User.find().sort({ _id: -1 }).limit(3).select('-password');

        // Get the 3 most recent tasks (sorted by _id descending)
        const recentTasks = await Task.find().sort({ _id: -1 }).limit(3).populate('user', 'name');

        res.status(200).json({
            totalPoints: totalPoints.length > 0 ? totalPoints[0].totalPoints : 0,
            totalTasks,
            biodegradableWastePercentage,
            totalUsers,
            recentUsers,
            recentTasks
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching stats", error: error.message });
    }
});

app.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;  // Default to page 1
        const limit = parseInt(req.query.limit) || 5; // Default limit 10 users
        //const taskLimit = parseInt(req.query.taskLimit) || 5; // Limit tasks per user

        const totalUsers = await User.countDocuments(); // Get total user count

        const users = await User.find()
            .select('-password') // Exclude password
            .populate({
                path: 'tasks',
                options: { limit: 5 }, // Limit tasks per user
            })
            .skip((page - 1) * 5) // Skip for pagination
            .limit(5); // Limit number of users per request

        res.status(200).json({
            totalUsers,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: page,
            users,
        });

    } catch (error) {
        res.status(500).json({ message: "Error fetching users", error: error.message });
    }
});

app.get('/user/tasks', async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // Fetch all tasks for the specific user
        const tasks = await Task.find({ user: userId }).select('-__v');

        res.status(200).json({ tasks });

    } catch (error) {
        res.status(500).json({ message: "Error fetching tasks", error: error.message });
    }
});