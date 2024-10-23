const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Initialize Express app
const app = express();

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Serve static files like CSS, JS, etc.
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/todoListDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define Task schema and model
const taskSchema = new mongoose.Schema({
  name: String,
  completed: Boolean
});

const Task = mongoose.model('Task', taskSchema);

// Home route to display tasks
app.get('/', async (req, res) => {
  const tasks = await Task.find();
  res.render('index', { tasks: tasks });
});

// Add a new task
app.post('/addTask', async (req, res) => {
  const taskName = req.body.taskName;
  const newTask = new Task({ name: taskName, completed: false });

  await newTask.save();
  res.redirect('/');
});

// Remove a task
app.post('/removeTask', async (req, res) => {
  const taskId = req.body.taskId;

  await Task.findByIdAndDelete(taskId);
  res.redirect('/');
});

// Toggle task completion
app.post('/toggleTask', async (req, res) => {
  const taskId = req.body.taskId;
  const task = await Task.findById(taskId);
  task.completed = !task.completed;
  await task.save();
  res.redirect('/');
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
