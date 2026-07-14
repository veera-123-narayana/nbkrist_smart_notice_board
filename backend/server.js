const express = require("express");
const cors = require("cors");
require("dotenv").config();

const telegramRoute = require("./routes/telegram");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/telegram", telegramRoute);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Telegram Server Running on Port ${PORT}`);
});