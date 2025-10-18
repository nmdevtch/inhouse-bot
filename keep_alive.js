// keep_alive.js
import express from "express";

const app = express();
const PORT = process.env.PORT || 4000;

app.get("/", (_req, res) => {
  res.send("✅ Bot Inhouse: keep-alive ativo!");
});

app.listen(PORT, () => {
  console.log(`🌐 Keep-alive server escutando na porta ${PORT}`);
});
