const mongoose = require("mongoose");

const todoActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    todoNumber: {
      type: Number,
      required: true,
      index: true,
    },

    action: {
      type: String,
      enum: ["CREATED", "UPDATED", "COMPLETED", "UNCOMPLETED", "DELETED"],
      required: true,
    },

    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

todoActivitySchema.index({
  userId: 1,
  todoNumber: 1,
  createdAt: -1,
});

module.exports = mongoose.model("TodoActivity", todoActivitySchema);
