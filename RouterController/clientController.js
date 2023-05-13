const { dbConfig, connection, pool } = require("../db/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();
const mysql = require("mysql");

const cookieParser = require("cookie-parser");
const { encryptPassword } = require("../middleware/password.encrypt");
// Register handeler function;


const handelClientRegister = async (req, res) => {
  try {
    const { email, password, firstname, lastname } = req.body;
if (
  !email || 
  !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) ||
  !password ||
  password.length < 6 ||
  !firstname ||
  firstname.trim().length === 0 ||
  !lastname ||
  lastname.trim().length === 0
) {
  // At least one of the fields is missing or invalid
  return res.status(400).json({ error: 'Invalid request data' });
}
    const time_stamp = Date.now(); // Get current timestamp
    const random_no = Math.random().toString(36).substring(2, 8);
    // creating a random database name for client;
    const tenant_uuid = `${time_stamp}_${random_no}`;

    let hashedPassword = await encryptPassword(password);
    const registrationQuery =
      "INSERT INTO registration (`email`, `password`, `tenant_uuid`) VALUES (?, ?, ?)";
    const registrationValues = [email, hashedPassword, tenant_uuid];

    pool.query(registrationQuery, registrationValues, async (err, registrationResult) => {
      if (err) {
        return res.status(500).send({ error: `Cannot process request: ${err}` });
      }

      // Creating the database
      const createDbQuery = `CREATE DATABASE tenant_${tenant_uuid}`;

      pool.query(createDbQuery, async (err, createDbResult) => {
        if (err) {
          return res.status(500).send({ error: `Cannot process request: ${err}` });
        }

        const userDbConfig = {
          ...dbConfig,
          database: `tenant_${tenant_uuid}`,
        };
        const pool1 = mysql.createPool(userDbConfig);

        pool1.getConnection(async (error, connection) => {
          if (error) {
            console.log(error);
            return res.status(300).send({ error: `Cannot process request: ${error}` });
          }
          let user=await createUserTableIfNotExists(pool1); // Check and create 'user' table if not exists
          let todo=await createTodoTableIfNotExists(pool1);  
        
          // Hash the password
          bcrypt.hash(password, Number(process.env.saltround), (err, hashedPassword) => {
            if (err) {
              console.error("Error hashing password:", err);
              return res.status(500).send({ error: "Error hashing password" });
            }

            const userQuery =
              "INSERT INTO user (`email`, `firstname`, `lastname`, `password`, `tenant_uuid`) VALUES (?, ?, ?, ?, ?)";
            const userValues = [email, firstname, lastname, hashedPassword, tenant_uuid];
            pool1.query(userQuery, userValues, (err, userResult) => {
              if (userResult) {
                return res.status(200).send({
                  result: `Inserted data into tenant_${tenant_uuid} successfully`,
                });
              } else {
                res.status(500).send({
                  result: `Error while inserting data into db tenant_${tenant_uuid}`,
                  err,
                });
              }
            });
          })
          connection.release();
          // Release the connection
        });
      });
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Cannot process request", error });
  }
};


// Login handler function

const handelClientLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Authenticate user and retrieve user's database information
    const isEmailPresentQ = "SELECT * FROM registration WHERE email=?";
    const value = [email];
    pool.query(isEmailPresentQ, value, (err, result) => {
      if (err) {
        return res.status(500).send({ error: "cannot process req", err });
      } else if (result.length === 0) {
        return res.status(401).send({ error: "please sign up first" });
      } else {
        // Perform password verification here
        // ...
        bcrypt.compare(password, result[0].password, (err, resul) => {
          if (err) {
            return res.status(500).json({ error: "Login again.", err });
          } else if(!resul) {

            return res.status(500).json({ error: "Plese enter correct password", err });}
            else{
            // Generate a JWT token
            let uuid = result[0].tenant_uuid;

            const token = jwt.sign({ uuid }, process.env.secret_key);
            
            return res
              .cookie("access_token", token, {
                httpOnly: true,
              })
              .status(200)
              .send({message: "Login successful", token,email,role:"client"});
            // Return the token in the response
          }
        });
      }
    });
  } catch (err) {
    // Handle authentication errors
    res.status(500).send({ error: "Internal server error", err });

    console.log(err);
  }
};
// Check if table exists and create if not
const createTodoTableIfNotExists = (pool1) => {
  return new Promise((resolve, reject) => {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS todo (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        description VARCHAR(255),
        status TINYINT(1) DEFAULT 0,
        user_id INT(55)
      )`;

    // Check if the table exists
    pool1.query(`SHOW TABLES LIKE 'todo'`, (error, results) => {
      if (error) {
        console.error("Error checking if todo table exists:", error);
        reject(error);
      } else {
        if (results.length === 0) {
          // Table does not exist, create it
          pool1.query(createTableQuery, (error) => {
            if (error) {
              console.error("Error creating todo table:", error);
              reject(error);
            } else {
              console.log("Todo table created successfully");
              resolve();
            }
          });
        } else {
          // Table already exists
          console.log("Todo table already exists");
          resolve();
        }
      }
    });
  });
};

// Check if table exists and create if not
const createUserTableIfNotExists = (pool1) => {
  return new Promise((resolve, reject) => {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS user (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firstname VARCHAR(255),
        lastname VARCHAR(255),
        email VARCHAR(255),
        password VARCHAR(255),
        role INT DEFAULT 1,
        tenant_uuid VARCHAR(255)
      )`;

    // Check if the table exists
    pool1.query(`SHOW TABLES LIKE 'user'`, (error, results) => {
      if (error) {
        console.error("Error checking if user table exists:", error);
        reject(error);
      } else {
        if (results.length === 0) {
          // Table does not exist, create it
          pool1.query(createTableQuery, (error) => {
            if (error) {
              console.error("Error creating user table:", error);
              reject(error);
            } else {
              console.log("User table created successfully");
              resolve();
            }
          });
        } else {
          // Table already exists
          console.log("User table already exists");
          resolve();
        }
      }
    });
  });
};





module.exports = { handelClientLogin,handelClientRegister };
