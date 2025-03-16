const mongoose = require('mongoose')
const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,

    },
    password: {
        type: String,
        required: true
    },
    address: {
        type: String
    },
    familyMember: {
        type: String,

    },
    holdingNo: {
        type: String,
    },
    usualWasteType: {
        type: String
    },
    points: {
        type: Number
    },
    profilePic: {
        type: String
    },

    tasks: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task'
        }
    ],
})

const User = mongoose.model("User", userSchema)
module.exports = User