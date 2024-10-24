import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';  
import session from 'express-session'; 
import dotenv from 'dotenv'; 

dotenv.config(); 

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key', 
  resave: false, 
  saveUninitialized: false, 
  cookie: { secure: false } 
}));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/todoListDB')
  .then(() => console.log("MongoDB connected"))
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




app.get('/', (req, res) => {
  res.render('home');
});


app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    
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


app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/todolist');
    }
    res.redirect('/login');
  });
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


const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
