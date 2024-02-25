const express = require('express');
const mongoose = require('mongoose');
const { Worker, isMainThread, workerData } = require('worker_threads');

const app = express();
const port = 3000;


mongoose.connect('mongodb://localhost:27017/dirwatcher', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

db.once('open', () => {
  console.log('Connected to MongoDB');
  const taskRunSchema = new mongoose.Schema({
    start_time: Date,
    end_time: Date,
    total_runtime: Number,
    magic_string_occurrences: Number,
    status: String,
  });

  const TaskRun = mongoose.model('TaskRun', taskRunSchema)

  let watchedDirectory = './watched_directory';
  let interval = 60000; // in milliseconds (default: 1 minute)
  let magicString = 'example';
  let isTaskRunning = false;

  function runTask() {
    const startTime = new Date();

    // Your logic to count occurrences of the magic string, track added/deleted files, and save results to the database

    const endTime = new Date();
    const totalRuntime = endTime - startTime;

    // Create a new task run document and save it to the database
    const taskRun = new TaskRun({
      start_time: startTime,
      end_time: endTime,
      total_runtime: totalRuntime,
      magic_string_occurrences: 10,
      status: 'success',
    });

    taskRun.save((err) => {
      if (err) {
        console.error('Error saving task run:', err);
      }
    });
  }

  function startTaskWorker() {
    const fs = require('fs');
    const cron = require('node-cron');
    
    // Function to count word occurrences in a file
    function countWordOccurrences(filePath, targetWord) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const words = fileContent.split(/\s+/);
    
      const count = words.reduce((acc, word) => {
        if (word.toLowerCase() === targetWord.toLowerCase()) {
          return acc + 1;
        }
        return acc;
      }, 0);
    
      return count;
    }
    
    // Schedule cron job to run every minute (adjust as needed)
    cron.schedule('* * * * *', () => {
      const filePath = './Text.js';
      const targetWord = 'loren';
    
      const occurrences = countWordOccurrences(filePath, targetWord);
      console.log(`The word '${targetWord}' appears ${occurrences} times in the file.`);
    });
    
  }

  function stopTaskWorker() {
    process.exit(0);
  }

  // REST API to configure, get task run details, start or stop the task
  app.use(express.json());

  app.get('/task-details', async (req, res) => {
    try {
      const latestTaskRun = await TaskRun.find();
      res.json(latestTaskRun);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/start-task', (req, res) => {
    const message = startTaskWorker();
    res.json({ success: true, message });
  });

  app.post('/stop-task', (req, res) => {
    stopTaskWorker();
    res.json({ success: true, message: 'Task stopped successfully' });
  });

  app.listen(port, () => {
    console.log(`DirWatcher app listening at http://localhost:${port}`);
  });
});
