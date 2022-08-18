const express = require("express");
const app = express();
const path = require("path");
const dotenv = require("dotenv").config();
const moment = require("moment");
moment.locale("ko");
const MongoClient = require("mongodb").MongoClient;

let db = null;
MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true }, (err, client) => {
  console.log("connect");
  if (err) {
    console.log(err, "mongodb connect err");
  }
  db = client.db("diary");
});

app.set("port", process.env.PORT || 8080);
const PORT = app.get("port");
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "/public")));
app.get("/", (req, res) => {
  res.render("index");
});
app.post("/add", (req, res) => {
  db.collection("count").findOne(
    {
      name: "total",
    },
    (err, result) => {
      const no = result.count;
      const name = req.body.name;
      const contents = req.body.contents;
      const sendTime = moment(new Date()).format("YYYY.MM.DD(ddd)");
      const insertData = {
        no: no + 1,
        name: name,
        contents: contents,
        time: sendTime,
      };
      db.collection("contents").insertOne(insertData, (err, result) => {
        db.collection("count").updateOne({ name: "total" }, { $inc: { count: 1 } }, (err, result) => {
          if (err) {
            console.log(err, "db insert err");
          }
        });
        res.redirect("/list");
      });
    }
  );
});
app.get("/list", (req, res) => {
  db.collection("contents")
    .find()
    .toArray((err, result) => {
      res.render("list", { list: result });
    });
});
app.listen(PORT, () => {
  console.log(`${PORT}포트`);
});
