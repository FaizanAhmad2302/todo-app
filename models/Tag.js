const mongoose = require("mongoose");
const { MAX_TAG_NAME_LENGTH } = require("../constants");

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: MAX_TAG_NAME_LENGTH,
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

// Unique compound index per user with case-insensitive collation
tagSchema.index(
  { userId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

module.exports = mongoose.model("Tag", tagSchema);
