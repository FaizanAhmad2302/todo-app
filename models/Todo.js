const mongoose = require("mongoose");
const { MAX_TITLE_LENGTH } = require("../constants");

const todoSchema = new mongoose.Schema(
  {
    todoNumber: {
      type: Number,
      required: true,
      unique: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: MAX_TITLE_LENGTH,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    dueDate: {
      type: Date,
      required: false,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Todo", todoSchema);
