const express = require("express");
const { authenticate } = require("../middleware/auth");
const { addTag, getTags, getTag, updateTag, deleteTag } = require("../tag");

const router = express.Router();

// All /tags routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /tags:
 *   get:
 *     summary: List all tags for the authenticated user
 *     tags: [Tags]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of tags
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tag'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", async (req, res) => {
  try {
    const tags = await getTags(req.user.id);
    res.status(200).json(tags);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

/**
 * @swagger
 * /tags:
 *   post:
 *     summary: Create a new tag
 *     tags: [Tags]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagCreateRequest'
 *     responses:
 *       201:
 *         description: Tag created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       400:
 *         description: Validation error or duplicate tag
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", async (req, res) => {
  try {
    const { name } = req.body || {};
    const tag = await addTag(req.user.id, name);
    res.status(201).json(tag);
  } catch (err) {
    const status = err.name === "ValidationError" ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * @swagger
 * /tags/{id}:
 *   get:
 *     summary: Get a specific tag by ID
 *     tags: [Tags]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag ObjectId
 *     responses:
 *       200:
 *         description: The requested tag
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       400:
 *         description: Invalid Tag ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tag not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", async (req, res) => {
  try {
    const tag = await getTag(req.user.id, req.params.id);
    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }
    res.status(200).json(tag);
  } catch (err) {
    const status = err.name === "ValidationError" ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * @swagger
 * /tags/{id}:
 *   patch:
 *     summary: Update a tag name
 *     tags: [Tags]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagUpdateRequest'
 *     responses:
 *       200:
 *         description: Tag updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       400:
 *         description: Validation error or duplicate tag
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tag not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/:id", async (req, res) => {
  try {
    const { name } = req.body || {};
    const tag = await updateTag(req.user.id, req.params.id, name);
    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }
    res.status(200).json(tag);
  } catch (err) {
    const status = err.name === "ValidationError" ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * @swagger
 * /tags/{id}:
 *   delete:
 *     summary: Delete a tag
 *     description: Deletes the tag and removes it from all associated user Todos.
 *     tags: [Tags]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag ObjectId
 *     responses:
 *       204:
 *         description: Tag deleted successfully
 *       400:
 *         description: Invalid Tag ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tag not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", async (req, res) => {
  try {
    const success = await deleteTag(req.user.id, req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Tag not found" });
    }
    res.status(204).send();
  } catch (err) {
    const status = err.name === "ValidationError" ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
