const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema(
    {
        todoNumber: {
            type: Number,
            required: true,
            unique: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 50
        },

        completed: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Todo", todoSchema);