("use strict");
const nodemailer = require("nodemailer");
require("dotenv").config();

const sendEmail = async (email, password) => {
  const transpoter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "manish63singh@gmail.com",
      pass: process.env.mailpassword,
    },
  });

  const mailoption = {
    from: "manish63singh@gmail.com",
    to: email,
    subject: "credentials for logging in  TODO_APP",
    text: `credential for username ${email} on todo app with password as ${password}` 
  }; 

 

 await transpoter.sendMail(mailoption, (err, info) => {
    if (err) return console.log("error", err);
    return "mail send", info.response;
  });
};

module.exports = {
  sendEmail,
};
