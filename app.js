require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

// IMPORT DB FUNCTIONS

const { addPlant, getPlantsByUserId } = require("./services/database");

const { authenticate } = require("./middleware");
const port = process.env.PORT;
const app = express();

app.use(cors());
app.use(authenticate());
app.listen(port, () => {
  console.log(`PlantDiary API listening on port ${port}`);
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((error, req, res, next) => {
  const status = error.status;
  const message = error.message;
  res.status(status).send(message);
});

// Server functions

app.get("/", (req, res) => {
  res.send({ message: "Hello from PlantDiary API!" });
});

app.get("/test", (req, res) => {
  res.send({ message: "Hello from PlantDiary API!", info: req.user });
});

app.get("/getplants", async (req, res) => {
  const userId = req.user.sub.split("|")[1];

  try {
    const plantList = await getPlantsByUserId(userId);
    res.send(plantList);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: "Unable to contact database - please try again later",
    });
  }
});

app.post("/add", async (req, res) => {
  const { plantDetails } = req.body;
  const userId = req.user.sub.split("|")[1];

  try {
    const newPlant = await addPlant(plantDetails, userId)
    res.send(newPlant);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: "Unable to contact database - please try again later",
    });
  }
});
