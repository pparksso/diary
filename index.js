const express = require("express");
const app = express();
const path = require("path");
const dotenv = require("dotenv").config();
const moment = require("moment");
moment.locale("ko");
const MongoClient = require("mongodb").MongoClient;
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");

let db = null;
MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true }, (err, client) => {
  console.log("connect");
  if (err) {
    console.log(err, "mongodb connect err");
  }
  db = client.db("diary");
});

app.use(session({ secret: process.env.COOKIE_SECRET }));

app.set("port", process.env.PORT || 8080);
const PORT = app.get("port");
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "/public")));
app.get("/", (req, res) => {
  res.render("index");
});
app.get("/join", (req, res) => {
  res.render("join");
});
app.post("/join", (req, res) => {
  const userNickname = req.body.nickname;
  const userPw = req.body.pw;
  const userName = req.body.name;
  const insertItem = {
    userNickname: userNickname,
    userpw: userPw,
    userName: userName,
  };
  db.collection("login").insertOne(insertItem, (err, result) => {
    if (err) {
      console.log(err, "insertErr");
      res.send(`<script>alert("회원가입에 실패했습니다. 다시 시도해주세요")</script>`);
    }
    res.send(`<script>alert("회원가입 되셨습니다."); location.href="/"</script>`);
  });
});
app.post("/login", (req, res) => {});
app.get("/add", (req, res) => {
  res.render("add");
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
app.post("/update", (req, res) => {
  const num = parseInt(req.body.num);
  db.collection("contents").updateOne({ no: num }, { $set: { update: true } }, (err, result) => {
    res.json({ isUpdate: true });
  });
});
app.get("/update", (req, res) => {
  db.collection("contents").findOne({ update: true }, (err, result) => {
    const name = result.name;
    const contents = result.contents;
    res.render("update", { name: name, contents: contents });
  });
});
app.post("/delete", (req, res) => {
  const num = parseInt(req.body.num);
  db.collection("contents").deleteOne({ no: num }, (err, result) => {
    if (err) {
      console.log(err, "delete err");
    }
    res.json({ isDel: result.acknowledged });
  });
});
app.post("/updateResult", (req, res) => {
  const name = req.body.name;
  const contents = req.body.contents;
  db.collection("contents").updateOne({ update: true }, { $set: { name: name, contents: contents } }, (err, result) => {
    if (err) {
      console.log(err, "update err");
    }
    db.collection("contents").updateOne(
      { update: true },
      {
        $unset: {
          update: true,
        },
      },
      (err, result) => {
        if (err) {
          console.log(err, "updateresult err");
        }
      }
    );
  });
  res.redirect("/list");
});
app.listen(PORT, () => {
  console.log(`${PORT}포트`);
});
