const mongoose = require('mongoose')
const TaskSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        require: true
    },
    wasteType:{
        type:String,
        required:true
    },
    time:{
        type:String
    },
    date:{
        type:String
    },
    points:{
        type:Number
    },
    rulesFollow:Boolean
})
const Task = mongoose.model("Task",TaskSchema)
module.exports=Task
