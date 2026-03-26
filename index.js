import express from "express";

const app = express();

app.get("/cron", async (req, res) => {
  res.send("ok");

  try {
    console.log("Fetching Upstox + calculating ORB...");
    // 👉 your logic here
  } catch (e) {
    console.error(e);
  }
});

app.listen(process.env.PORT || 3000);