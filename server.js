import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';  // For password hashing
import session from 'express-session'; // For session management
import dotenv from 'dotenv'; // For environment variables

dotenv.config(); // Load environment variables from .env file

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key', 
  resave: false, 
  saveUninitialized: false, // Only save session if something changes
  cookie: { secure: false } // set true for HTTPS
}));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/todoListDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  tasks: [{ name: String, completed: Boolean }]
});

const User = mongoose.model('User', userSchema);

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Routes

// Home Page
app.get('/', (req, res) => {
  res.render('home');
});

// Signup Page
app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('signup', { error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword, tasks: [] });
    await newUser.save();
    req.session.userId = newUser._id;
    res.redirect('/todolist');
  } catch (error) {
    res.render('signup', { error: 'An error occurred. Please try again.' });
  }
});

// Login Page
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user._id;
      res.redirect('/todolist');
    } else {
      res.render('login', { error: 'Invalid email or password' });
    }
  } catch (error) {
    res.render('login', { error: 'An error occurred. Please try again.' });
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/todolist');
    }
    res.redirect('/login');
  });
});

// To-Do List Page (only accessible if authenticated)
app.get('/todolist', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    res.render('todolist', { tasks: user.tasks });
  } catch (error) {
    res.render('todolist', { tasks: [], error: 'Could not fetch tasks. Please try again.' });
  }
});

// Add Task
app.post('/addTask', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    user.tasks.push({ name: req.body.taskName, completed: false });
    await user.save();
    res.redirect('/todolist');
  } catch (error) {
    res.redirect('/todolist', { error: 'Could not add task. Please try again.' });
  }
});

// Remove Task
app.post('/removeTask', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    user.tasks = user.tasks.filter(task => task._id.toString() !== req.body.taskId);
    await user.save();
    res.redirect('/todolist');
  } catch (error) {
    res.redirect('/todolist', { error: 'Could not remove task. Please try again.' });
  }
});

// Toggle Task Completion
app.post('/toggleTask', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const task = user.tasks.id(req.body.taskId);
    if (task) {
      task.completed = !task.completed;
      await user.save();
    }
    res.redirect('/todolist');
  } catch (error) {
    res.redirect('/todolist', { error: 'Could not update task. Please try again.' });
  }
});
app.get('/todolist', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const completedTasks = user.tasks.filter(task => task.completed).length;
    const incompleteTasks = user.tasks.filter(task => !task.completed).length;
    res.render('todolist', { tasks: user.tasks, completedTasks, incompleteTasks });
  } catch (error) {
    res.render('todolist', { tasks: [], error: 'Could not fetch tasks. Please try again.' });
  }
});


// Error handling for undefined routes
app.use((req, res) => {
  res.status(404).render('404', { error: 'Page not found' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
