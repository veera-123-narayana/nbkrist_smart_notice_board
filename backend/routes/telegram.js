const express = require("express");
const axios = require("axios");

const router = express.Router();

router.post("/send", async (req, res) => {
  try {
    const { chatId, title, description, department, priority } = req.body;

    const message = `
📢 *NBKRIST Smart Notice Board*

🏫 Department: ${department}

📌 Title:
${title}

📝 Description:
${description}

🚨 Priority:
${priority}

━━━━━━━━━━━━━━━━━━
Automatically Generated
`;

    const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;

    const response = await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    });

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);

    res.status(500).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;