const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const moment = require("moment");
app.use(cors());
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  exercises: [{ type: mongoose.Schema.Types.ObjectId, ref: "ExerciseSchema" }],
});
const ExerciseSchema = new mongoose.Schema({
  username: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "UserSchema" },
});
const UserModel = new mongoose.model("UserSchema", UserSchema);
const ExerciseModel = new mongoose.model("ExerciseSchema", ExerciseSchema);
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
let bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.get("/api/users", async (req, res) => {
  const userCreated = await UserModel.find().exec();
  res.json(userCreated);
});
app.get("/api/users/:_id/logs", async (req, res) => {
  const id = req.params._id;
  const query = req.query;
  console.log(query);
  const user = await UserModel.findById(id).exec();
  if (!user) {
    res.json({ error: "Invalid User" });
    return;
  }
  let condition = { user: id };
  if (query?.from) {
    condition["from"] = { $gte: new Date(query?.from) };
  }
  if (query?.to) {
    condition["to"] = { $lte: new Date(query?.to) };
  }
  const Exercise = await ExerciseModel.find({ user: id })
    .limit(query?.limit || 0)
    .exec();

  let returnObj = {
    username: user?.username,
    count: Exercise?.length || 0,
    _id: user?.id,
    log:
      Exercise?.length > 0
        ? Exercise?.map((item) => ({
            description: item?.description,
            duration: Number(item?.duration),
            date: new Date(item?.date)?.toDateString(),
          }))
        : [],
  };
  if (query?.limit) {
    returnObj["limit"] = query?.limit;
  }
  if (query?.from) {
    returnObj["from"] = new Date(query?.from)?.toDateString();
  } if (query?.to) {
    returnObj["to"] =  new Date(query?.to)?.toDateString();
  }
  res.json(returnObj);
});
app.post("/api/users", async (req, res) => {
  const data = req.body;
  console.log(data);
  const userCreated = await UserModel.create({ username: data.username });
  res.json({ username: userCreated.username, _id: userCreated._id });
});
app.post("/api/users/:_id/exercises", async (req, res) => {
  const data = req.body;
  const id = req.params._id;
  console.log(data);
  const user = await UserModel.findById(id).exec();
  if (!user) {
    res.json({ error: "no user found" });
  }
  let obj = {
    username: user.username,
    description: data.description,
    duration: data.duration,
    date: data.date || new Date(),
    user: id,
  };
  const ExerciseCreated = await ExerciseModel.create(obj);
  let returnObj = {
    _id: ExerciseCreated.user,
    username: ExerciseCreated.username,
    date: moment(ExerciseCreated.date).format("ddd MMM DD YYYY"),
    duration: ExerciseCreated.duration,
    description: ExerciseCreated.description,
  };
  res.json(returnObj);
});

const listener = app.listen(process.env.PORT || 3001, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
