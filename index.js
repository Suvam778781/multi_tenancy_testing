const express = require("express");


const app = express();

app.use(express.json());
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { connection, releaseConnectionPool } = require("./db/db");
const { clientRoute } = require("./Routes/clientRoute");
const { usersRoute } = require("./Routes/userRoute");
const { userTodoRoute } = require("./Routes/todoRoute");

app.use(cors({
  origin: "*"
}));

app.get("/", (req, res) => {
  res.status(200).send({ result: "Home page" });
});

app.use(cookieParser());
//clients can register and login from this route /client
app.use("/client", clientRoute);
//client can perform CRUD on users from the endpoint below ;
app.use('/user', usersRoute);
//admin and user can perform CRUD on todo's below the end point
app.use("/todo", userTodoRoute);

const server = app.listen(8090, async (err) => {
  if (err) {
    console.log(err);
  } else {
    try {
      await connection(); // Connect to the database
      console.log("Connected to the database");
    } catch (error) {
      console.log("Error while connecting to the database:", error);
      server.close();
    }
  }
});

// Close the database connection when the server is closed
server.on("close", () => {
  releaseConnectionPool();
  console.log("Server closed. Connection pool released.");
});
