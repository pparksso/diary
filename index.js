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
let isLogged = false;

let db = null;
MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true }, (err, client) => {
  console.log("connect");
  if (err) {
    console.log(err, "mongodb connect err");
  }
  db = client.db("diary");
});

app.use(
  session({
    secret: "anything",
    resave: true,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
passport.use(
  new LocalStrategy(
    {
      usernameField: "nickname",
      passwordField: "pw",
      session: true,
      passReqToCallback: false,
      cookie: {
        maxAge: 1000 * 60 * 60,
      },
    },
    (nickname, pw, done) => {
      db.collection("user").findOne({ userNickname: nickname }, (err, result) => {
        if (err) return done(err);
        if (!result) return done(null, false, { message: "존재하지 않는 닉네임입니다." });
        if (result) {
          if (pw === result.userPw) {
            console.log("로그인 성공");
            return done(null, result);
          } else {
            console.log("로그인 실패");
            return done(null, false, { message: "비밀번호를 확인해주세요" });
          }
        }
      });
    }
  )
);
passport.serializeUser((user, done) => {
  done(null, user.userNickname);
});
passport.deserializeUser((nickname, done) => {
  db.collection("user").findOne({ userNickname: nickname }, (err, result) => {
    done(null, result);
  });
});
app.set("port", process.env.PORT || 8080);
const PORT = app.get("port");
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "/public")));
app.get("/", (req, res) => {
  res.render("index", { userInfo: req.user });
});
app.get("/join", (req, res) => {
  res.render("join");
});
app.post("/join", (req, res) => {
  db.collection("count").findOne(
    {
      name: "user",
    },
    (err, result) => {
      const userNum = result.count;
      const userNickname = req.body.nickname;
      const userPw = req.body.pw;
      const userName = req.body.name;
      const insertItem = {
        userNum: userNum + 1,
        userNickname: userNickname,
        userPw: userPw,
        userName: userName,
      };
      db.collection("user").insertOne(insertItem, (err, result) => {
        db.collection("count").updateOne(
          { name: "user" },
          {
            $inc: {
              count: 1,
            },
          },
          (err, result) => {
            if (err) {
              console.log(err, "insertErr");
              res.send(`<script>alert("회원가입에 실패했습니다. 다시 시도해주세요")</script>`);
            }
          }
        );
        res.send(`<script>alert("회원가입 되셨습니다."); location.href="/"</script>`);
      });
    }
  );
});
app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/",
    successRedirect: "/add",
  })
);
app.get("/add", (req, res) => {
  res.render("add");
});
app.post("/add", (req, res) => {
  db.collection("count").findOne(
    {
      name: "total",
    },
    (err, result) => {
      const userNum = req.user.userNum;
      const no = result.count;
      const mood = req.body.mood;
      const contents = req.body.contents;
      const sendTime = moment(new Date()).format("YYYY.MM.DD(ddd)");
      const insertData = {
        userNum: userNum,
        no: no + 1,
        mood: mood,
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
    .find({ userNum: req.user.userNum })
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
    const mood = result.mood;
    const contents = result.contents;
    res.render("update", { mood: mood, contents: contents });
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
  const mood = req.body.mood;
  const contents = req.body.contents;
  db.collection("contents").updateOne({ update: true }, { $set: { mood: mood, contents: contents } }, (err, result) => {
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
app.get("/logout", (req, res) => {
  if (req.user) {
    req.session.destroy();
    res.send(`<script>alert("로그아웃 되었습니다."); location.href = "/"</script>`);
  }
});
app.listen(PORT, () => {
  console.log(`${PORT}포트`);
});
