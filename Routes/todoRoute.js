const express = require('express');
const { handelAddTodo, handleDeleteTodo, handleUpdateTodo, handleGetAllTodo, handleGetTodo } = require('../RouterController/todoController');
const { validateAdmin } = require('../middleware/validateadmin');


const userTodoRoute = express.Router();

require('dotenv').config();

// Route for adding a todo
userTodoRoute.post('/addtodo', handelAddTodo);
// Route for get todos
//userTodoRoute.post('/alltodo', handelAddTodo);
// Route for delete a todo
userTodoRoute.delete('/delete/:id', handleDeleteTodo);
// Route for update a todo
userTodoRoute.patch('/update/:id', handleUpdateTodo);
// Route to get all todo
userTodoRoute.get('/getalltodo',validateAdmin,handleGetAllTodo);
//get perticular user todos
userTodoRoute.get('/usertodo',handleGetTodo)
module.exports={userTodoRoute}