const express = require("express");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/products", (req, res) => {
  res.send([
    {
      productCode: 1,
      productName: "Heineken",
      productPrice: 19000,
      description: "Bia Heineken",
    },
    { productCode: 2, productName: "Tiger", productPrice: 18000 },
    { productCode: 3, productName: "Sapporo", productPrice: 21000 },
  ]);
});

const db = require("./config/db");
db.connect();

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
