const jwt = require("jsonwebtoken");
const { dbConfig, connection, pool } = require("../db/db");
const mysql = require("mysql");
const { encryptPassword } = require("../middleware/password.encrypt");
const { decryptPassword } = require("../middleware/password.decrypt");
const { sendCredentialsEmail } = require("../middleware/email&pass.sender");



const addUser = async(req, res) => {
  try {
    const { email, firstname, lastname, password } = req.body;
    const token = req.cookies.access_token;
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


let username=`${firstname} ${lastname}`
    // await sendCredentialsEmail(email,username,password)
    jwt.verify(token, process.env.secret_key, async(err, result) => {
      if (err) {
        return res.status(401).send({ error: "cannot process req", err });
      } else {
      let hashpassword=await encryptPassword(password)

        const insertUserQuery =
          "INSERT INTO user_incomming (email, firstname, lastname, password, role, org_id) VALUES (?, ?, ?, ?, ?, ?)";
        //saving user uuid to a cookie for later use
        res.cookie("useruuid", result.org_id, {
              httpOnly: true,
            });

          console.log(req.cookies.useruuid,"useriiid")

        let uuid = await encryptPassword(result.uuid) 
     
        const insertUserValues = [
          email,
          firstname,
          lastname,
          hashpassword,
          0,
          uuid,
        ];
        pool.query(insertUserQuery, insertUserValues, (err, resul) => {
          if (err) {
            // pool.release();
            return res.status(401).send({ error: "cannot process req", err });
          }
          // pool.release();

          const dbName = `tenant_${result.uuid}`;
          const userDbConfig = {
            ...dbConfig,
            database: dbName,
          };
          const pool1 = mysql.createPool(userDbConfig);
          pool1.getConnection((error, connection) => {
            if (error) {
              return res
                .status(401)
                .send({ error: "error while connection to db", error });
            }
            const insertUserQuery =
              "INSERT INTO user (email, firstname, lastname, password, role, tenant_uuid) VALUES (?, ?, ?, ?, ?, ?)";
            let uuid = result.uuid;
            const insertUserValues = [
              email,
              firstname,
              lastname,
              hashpassword,
              0,
              uuid,
            ];
            connection.query(
              insertUserQuery,
              insertUserValues,
              (err, result) => {
                if (err) {
                  connection.release();
                  return res
                    .status(401)
                    .send({ error: "cannot process req", err });
                }
                connection.release();
                res.send("User added successfully");
              }
            );
          });
        });
      }
    });
  } catch (error) {
    console.log(error);
    res.send("error");
  }
};
const getUser = (req, res) => {
  try {
    const { email } = req.query;
    const token = req.cookies.access_token;

    jwt.verify(token, process.env.secret_key, (err, result) => {
      if (err)
        return res.status(401).send({ error: "cannot process req", err });

      const dbName = `tenant_${result.uuid}`;
      const userDbConfig = {
        ...dbConfig,
        database: dbName,
      };
      const pool1 = mysql.createPool(userDbConfig);

      pool1.getConnection((error, connection) => {
        if (error) {
          return res
            .status(401)
            .send({ error: "error while connection to db", error });
        }
        const selectUserQuery = "SELECT * FROM user WHERE email = ?";
        const selectUserValues = [email];

        connection.query(selectUserQuery, selectUserValues, (err, result) => {
          if (err) {
            connection.release();
            return res.status(401).send({ error: "cannot process req", err });
          }
          connection.release();
          res.send(result);
        });
      });
    });
  } catch (error) {
    console.log(error);
    res.send("error");
  }
};

const updateUser = (req, res) => {
  try {
    const { email, firstname, lastname, password } = req.body;
    const token = req.cookies.access_token;

    jwt.verify(token, process.env.secret_key, (err, result) => {
      if (err)
        return res.status(401).send({ error: "cannot process req", err });

      const dbName = `tenant_${result.uuid}`;
      const userDbConfig = {
        ...dbConfig,
        database: dbName,
      };
      const pool1 = mysql.createPool(userDbConfig);

      pool1.getConnection((error, connection) => {
        if (error) {
          return res
            .status(401)
            .send({ error: "error while connection to db", error });
        }

        console.log("Connected to the database");

        const updateUserQuery =
          "UPDATE user SET firstname = ?, lastname = ?, password = ? WHERE email = ?";
        const updateUserValues = [firstname, lastname, password, email];

        connection.query(updateUserQuery, updateUserValues, (err, result) => {
          if (err) {
            connection.release();
            return res.status(401).send({ error: "cannot process req", err });
          }

          connection.release();
          res.send("User updated successfully");
        });
      });
    });
  } catch (error) {
    console.log(error);
    res.send("error");
  }
};

const deleteUser = (req, res) => {
  try {
    const { id} = req.params;
    const token = req.cookies.access_token;

    jwt.verify(token,process.env.secret_key, (err, result) => {
      if (err)
        return res.status(401).send({ error: "cannot process req", err });

      const dbName = `tenant_${result.uuid}`;
      const userDbConfig = {
        ...dbConfig,
        database: dbName,
      };
      const pool1 = mysql.createPool(userDbConfig);

      pool1.getConnection((error, connection) => {
        if (error) {
          return res
            .status(401)
            .send({ error: "error while connection to db", error });
        }

        console.log("Connected to the database");

        const deleteUserQuery = "DELETE FROM user WHERE id = ?";
        const deleteUserValues = [id];

        connection.query(deleteUserQuery, deleteUserValues, (err, result) => {
          if (err) {
            connection.release();
            return res.status(401).send({ error: "cannot process req", err });
          }
          connection.release();
          res.send("User deleted successfully");
        });
      });
    });
  } catch (error) {
    console.log(error);
    res.send("error");
  }
};

// User login handler function
const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    // Create a MySQL connection pool
    const pool = mysql.createPool(dbConfig);

    // Retrieve the user from the database based on email
    const query = "SELECT * FROM user_incomming WHERE email = ?";
    pool.query(query, [email], async (error, results) => {
      if (error) {
        console.error("Error retrieving user:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
      // Check if the user exists
      if (results.length === 0) {
        return res.status(401).json({ error: "User not found pleae signup" });
      }
      const user = results[0];
      // Compare the provided password with the hashed password stored in the database
      const passwordMatch = await decryptPassword(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      // Generate a token using the user ID

      //getting uuid from user cookie;

      const useruuid=req.cookies.useruuid

      console.log(req.cookies.useruuid,"u")
 
       
      const decryptuuid=await decryptPassword(useruuid,user.org_id) 
      
      console.log(decryptuuid,"de");
       
      const token = jwt.sign({ org_id: decryptuuid}, process.env.secret_key);

      // Set the token as a cookie using the 'access_token' name
      res.cookie("user_acces_token", token, {
        httpOnly: true,
        // Set to true if using HTTPS
      });
      
      res.cookie("user_email", results[0].email, {
        httpOnly: true,
        // Set to true if using HTTPS
      });

      // Return a success response
      res.status(200).json({ message: "Login successful", token,email:email,role:"user"});
    });
  } catch (error) {
    console.error("Error in user login:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const handleGetAllUser = (req, res) => {
  try {
    const tenantId = req.headers.tenant_uuid;
    // Connect to the tenant database
    const dbName = `tenant_${tenantId}`;
    const userDbConfig = {
      ...dbConfig,
      database: dbName,
    };
    const pool1 = mysql.createPool(userDbConfig);

    pool1.getConnection((error, connection) => {
      if (error) {
        return res
          .status(401)
          .send({ error: "error while connecting to the database", error });
      }

      const query = "SELECT * FROM user";
      connection.query(query, (err, results) => {
        connection.release();

        if (err) {
          return res
            .status(401)
            .send({ error: "cannot process request", err });
        }

        res.send(results);
      });
    });
  } catch (error) {
    console.log(error);
    res.send("error");
  }
};





module.exports = {
  addUser,deleteUser,updateUser,getUser,userLogin,handleGetAllUser
};






