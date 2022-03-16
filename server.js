const express = require("express");
const app = express();
const bodyParser = require("body-parser");
app.use(express.urlencoded({ extended: true }));
const MongoClient = require("mongodb").MongoClient;
app.set("view engine", "ejs");

const methodOverride = require("method-override");
app.use(methodOverride("_method"));

app.use("/public", express.static("public"));

require('dotenv').config()

const http = require('http').createServer(app);
const { Server, Socket } = require("socket.io");
const io = new Server(http);



var db;
MongoClient.connect(
  process.env.DB_URL,
  function (에러, client) {
    if (에러) return console.log(에러);

    db = client.db("todoapp");

    http.listen(process.env.PORT, function () {
      console.log("listening on 8080");
    });
  }
);

app.get('/socket',function(요청,응답){
  응답.render('socket.ejs')
})

io.on('connection',function(socket){
  console.log(socket.id)

  socket.on('room1-send',function(data){
    io.to('room1').emit('broadcast',data)
  })

  socket.on('joinroom',function(data){
    socket.join('room1');
  })

  

  socket.on('user-send',function(data){
    //단체채팅방
    io.emit('broadcast',data)

    //특정유저에게만 전송
    //io.to(socket.id).emit('broadcast',data)
  })


})




app.get("/pet", function (요청, 응답) {
  응답.send("펫사이트 입니다");
});
app.get("/beauty", function (요청, 응답) {
  응답.send("뷰티사이트 입니다");
});
app.get("/", function (요청, 응답) {
  //응답.sendFile(__dirname + '/views/index.ejs')
  응답.render("index.ejs");
});
app.get("/write", function (요청, 응답) {
  //응답.sendFile(__dirname + '/views/write.ejs')
  응답.render("write.ejs");
});



// /list 로 get 요청하면
// db로 꾸며진 ejs 보여줌
app.get("/list", function (요청, 응답) {
  //디비에 저장된 post collection 안에 데이터 꺼내기
  db.collection("post")
    .find()
    .toArray(function (에러, 결과) {
      console.log(결과);
      응답.render("list.ejs", { posts: 결과 });
    });
});



app.get("/detail/:id", function (요청, 응답) {
  db.collection("post").findOne(
    { _id: parseInt(요청.params.id) },
    function (에러, 결과) {
      console.log(결과);
      응답.render("detail.ejs", { data: 결과 });
    }
  );
});

app.get("/edit/:id", function (요청, 응답) {
  db.collection("post").findOne(
    { _id: parseInt(요청.params.id) },
    function (에러, 결과) {
      console.log(결과);
      응답.render("edit.ejs", { post: 결과 });
    }
  );
});
app.put("/edit", function (요청, 응답) {
  db.collection("post").updateOne(
    { _id: parseInt(요청.body.id) },
    { $set: { 제목: 요청.body.title, 날짜: 요청.body.date } },
    function (에러, 결과) {
      console.log("수정완료");
      응답.redirect("/list");
    }
  );
});

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const { ObjectId } = require("mongodb");

app.use(
  session({ secret: "비밀코드", resave: true, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/login", function (요청, 응답) {
  응답.render("login.ejs");
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/fail",
  }),
  function (요청, 응답) {
    응답.redirect("/");
  }
);

app.get("/mypage", 로그인했니, function (요청, 응답) {
  console.log(요청.user)
  응답.render('mypage.ejs', { 사용자: 요청.user })
});

function 로그인했니(요청, 응답, next) {
  if (요청.user) {
    next()
  } else {
    응답.send('로그인안하쎴는데요')
  }

}

//검사하는 코드
passport.use(
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "pw",
      session: true,
      passReqToCallback: false,
    },
    function (입력한아이디, 입력한비번, done) {
      //console.log(입력한아이디, 입력한비번);
      db.collection("login").findOne(
        { id: 입력한아이디 },
        function (에러, 결과) {
          if (에러) return done(에러);

          if (!결과)
            return done(null, false, { message: "존재하지않는 아이디요" });
          if (입력한비번 == 결과.pw) {
            return done(null, 결과);
          } else {
            return done(null, false, { message: "비번틀렸어요" });
          }
        }
      );
    }
  )
);

//세션을 저장, 결과가 user로 들어감, 세선id정보를 쿠키로 보냄
passport.serializeUser(function (user, done) {
  done(null, user.id);
});
//로그인정보를 db에서 찾는 역할
passport.deserializeUser(function (아이디, done) {
  db.collection('login').findOne({ id: 아이디 }, function (에러, 결과) {
    done(null, 결과);
  })

});

app.post('/register', function (요청, 응답) {
  db.collection('login').insertOne({ id: 요청.body.id, pw: 요청.body.pw }, function (에러, 결과) {
    응답.redirect('/')
  })
})



//어떤사람이 /add경로로 post 요청을 하면 ~해주세요
app.post("/add", function (요청, 응답) {
  응답.send("전송완료");

  db.collection("counter").findOne(
    { name: "게시물갯수" },
    function (에러, 결과) {
      console.log(결과.totalPost);
      var 총개시물갯수 = 결과.totalPost;
      var 저장할거 = { _id: 총개시물갯수 + 1, 작성자: 요청.user._id, 제목: 요청.body.title, 날짜: 요청.body.date }

      db.collection("post").insertOne(
        저장할거,
        function (에러, 결과) {
          console.log("저장완료");
          db.collection("counter").updateOne(
            { name: "게시물갯수" },
            { $inc: { totalPost: 1 } },
            function (에러, 결과) {
              if (에러) return console.log(에러);
            }
          );
        }
      );
    }
  );
});

app.delete("/delete", function (요청, 응답) {
  console.log(요청.body);
  요청.body._id = parseInt(요청.body._id);

  var 삭제할데이터 = { _id: 요청.body.id, 작성자: 요청.user._id }

  db.collection("post").deleteOne(삭제할데이터, function (에러, 결과) {
    console.log("삭제완료");
    if (결과) { console.log(결과) }
    응답.status(200).send({ message: "성공했습니다" });
  });
});






app.get('/search', (요청, 응답) => {
  //console.log(요청.query.value)
  var 검색조건 = [
    {
      $search: {
        index: 'titleSearch',
        text: {
          query: 요청.query.value,
          path: '제목'
        }
      }
    }
  ]
  db.collection('post').aggregate(검색조건).toArray((에러, 결과) => {
    console.log(결과)
    응답.render('search.ejs', { posts: 결과 })
  })
})

// /경로로 접속시 이 미들웨어 사용
app.use('/shop', require('./routes/shop.js'));

// app.get('/shop/shirts', function(요청, 응답){
//   응답.send('셔츠 파는 페이지입니다.');
// });

// app.get('/shop/pants', function(요청, 응답){
//   응답.send('바지 파는 페이지입니다.');
// }); 

app.use('/board/sub', require('./routes/board.js'));


//const {ObjectId} = require('mongodb')

app.post('/chatroom', 로그인했니, function (요청, 응답) {
  var 저장할거 = {
    title: '무슨무슨채팅방',
    member: [ObjectId(요청.body.당한사람id), 요청.user._id],
    date: new Date()
  }


  db.collection('chatroom').insertOne(저장할거).then((결과) => {
    응답.send('성공')
  })
})

app.get('/chat', 로그인했니, function (요청, 응답) {

  db.collection('chatroom').find({ member: 요청.user._id }).toArray().then((결과) => {
    응답.render('chat.ejs', { data: 결과 })
  })


})

app.post('/message', 로그인했니, function (요청, 응답) {

  var 저장할거 = {
    parent: 요청.body.parent,
    content: 요청.body.content,
    userid: 요청.user._id,
    date: new Date
  }



  db.collection('message').insertOne(저장할거).then((결과) => {
    응답.send(결과)
  })
})


app.get('/message/:id', 로그인했니, function (요청, 응답) {

  //헤더수정
  응답.writeHead(200, {
    "Connection": "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });

  db.collection('message').find({ parent: 요청.params.id }).toArray()
    .then((결과) => {
      응답.write('event: test\n');
      //실시간 전송시 문자자료만 전송이가능 문자로 변환
      응답.write('data: ' + JSON.stringify(결과) + '\n\n');

    })

  const pipeline = [
    { $match: { 'fullDocument.parent': 요청.params.id } }
  ];

  //db.collection을 watch감시
  const changeStream = db.collection('message').watch(pipeline);

  changeStream.on('change', (result) => {
    //console.log(result.fullDocument);
    응답.write('event: test\n');
    응답.write('data: ' + JSON.stringify([result.fullDocument]) + '\n\n');
  });


});