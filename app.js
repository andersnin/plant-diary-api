require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
var http = require("http");

const {
  getUsers,
  createUser,
  editUser,
  deleteUser,
  getMessages,
  getUserById,
  postReaction,
  getUserByEmail,
  postNewMessage,
  getUserMatchesById,
  getPotentialMatches,
  getMessagesByUserId,
} = require("./services/database");

// Express Server

const port = process.env.PORT;
const secret = process.env.SECRET;

const app = express();

app.use(cors());

// Websocket Server

var server = http.createServer(app);

const { Server } = require("socket.io");
const { resourceLimits } = require("worker_threads");
const { SocketAddress } = require("net");
const io = new Server(server, {
  transport: "polling",
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.emit("connection", null);
  console.log("user connected");

  socket.on("getMessages", ({ token, string }) => {
    setInterval(async function () {
      try {
        const payload = jwt.verify(token, Buffer.from(secret, "base64"));
        let messages = await getMessages(payload.id, string);
        socket.emit("recieveMessages", messages);
      } catch (error) {
        console.log(error);
        socket.emit("oops", { error });
      }
    }, 1000);
  });

  socket.on("getMatches", (token) => {
    setInterval(async function () {
      try {
        const payload = jwt.verify(token, Buffer.from(secret, "base64"));
        let potentialMatches = await getPotentialMatches(payload.id);
        socket.emit("recieveMatches", potentialMatches);
      } catch (error) {
        console.log(error);
        socket.emit("oops", { error });
      }
    }, 1000);
  });

  socket.on("end", function () {
    socket.disconnect(0);
    console.log("User disconnected");
  });
});

server.listen(port, () => {
  console.log(`PlantDiary API listening on port ${port}`);
});

// Server functions

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send({ message: "Hello from PlantDiary API!" });
});

app.get("/users", async (req, res) => {
  try {
    const users = await getUsers();
    res.send(users);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: "Unable to contact database - please try again",
    });
  }
});

app.get("/users/:userid", async (req, res) => {
  try {
    const userId = req.params.userid;
    const user = await getUserById(userId);
    res.send(user);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: "Unable to contact database - please try again",
    });
  }
});

app.get("/swipecards/:userid", async (req, res) => {
  try {
    const userId = req.params.userid;
    const users = await getPotentialMatches(userId);
    res.send(users);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: "Unable to contact database - please try again",
    });
  }
});

app.post("/add", async (req, res) => {
  const { plantDetails } = req.body;
  const token = req.headers["autorization"];

  try {
    const payload = jwt.verify(token, Buffer.from(secret, "base64"));
    let msg = "Check!"
    res.send(msg, payload);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: "Unable to contact database - please try again later",
    });
  }
});

app.get("/users/:userid/matches", async (req, res) => {
  try {
    const userId = req.params.userid;
    const matches = await getUserMatchesById(userId);
    res.send(matches);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: "Unable to contact database - please try again",
    });
  }
});

app.post("/signup", async (req, res) => {
  const { img_url, surname, firstname, email, password, sex, age, breed, bio } =
    req.body;
  console.log(req.body);

  try {
    const newUser = await createUser(
      img_url,
      surname,
      firstname,
      email,
      password,
      sex,
      age,
      breed,
      bio
    );
    res.send(newUser);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: "Unable to contact database - please try again",
    });
  }
});

app.put("/users/:userid", function (req, res) {
  const {
    id,
    surname,
    firstname,
    email,
    password,
    sex,
    age,
    breed,
    bio,
    img_url,
  } = req.body;

  try {
    const updatedUser = editUser(
      id,
      surname,
      firstname,
      email,
      password,
      sex,
      age,
      breed,
      bio,
      img_url
    );

    res.send(updatedUser);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: "Unable to contact database - please try again",
    });
  }
});

app.post("/message", async (req, res) => {
  const { newMessage, toUserId } = req.body;
  const token = req.headers["x-auth-token"];

  try {
    const payload = jwt.verify(token, Buffer.from(secret, "base64"));
    const message = await postNewMessage(payload.id, toUserId, newMessage);
    res.send(message);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: "Unable to contact database - please try again later",
    });
  }
});

app.get("/messages", async (req, res) => {
  const token = req.headers["x-auth-token"];

  try {
    const payload = jwt.verify(token, Buffer.from(secret, "base64"));
    const messages = await getMessagesByUserId(payload.id);
    res.send(messages);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: "Unable to contact database - please try again later",
    });
  }
});

app.get("/messages/:fromuserid/:touserid", async (req, res) => {
  try {
    const { fromuserid, touserid } = req.params;
    const messages = await getMessages(fromuserid, touserid);
    res.send(messages);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(401).send({ error: "Unknown user" });
    }

    if (user.password !== password) {
      return res.status(401).send({ error: "Wrong password" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        surname: user.surname,
      },
      Buffer.from(secret, "base64")
    );

    res.send({
      token: token,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.delete("/delete", async (req, res) => {

  try {
    const token = req.headers["x-auth-token"];
    const payload = jwt.verify(token, Buffer.from(secret, "base64"));
    const deleter = await deleteUser(payload.id);
    res.send(deleter);
  } catch (error) {
    console.log(error);
    res.status(401).send({
      error: "Unable to authenticate - please use a valid token",
    });
  }
});
