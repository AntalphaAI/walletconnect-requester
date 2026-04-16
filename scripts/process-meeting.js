#!/usr/bin/env node
/**
 * Meeting Processing Script
 * 
 * Processes pending meeting transcriptions:
 * 1. Reads pending-tasks.json
 * 2. Summarizes transcription
 * 3. Sends summary to Discord
 * 4. Creates Google Doc (or Notion as fallback)
 * 5. Updates task status
 */

const fs = require('fs');
const path = require('path');

const RECALL_RECORD_DIR = path.join(__dirname, '..', 'recall-record');
const PENDING_TASKS_FILE = path.join(RECALL_RECORD_DIR, 'pending-tasks.json');

/**
 * Get all pending tasks
 */
function getPendingTasks() {
  if (!fs.existsSync(PENDING_TASKS_FILE)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(PENDING_TASKS_FILE, 'utf-8');
    const tasks = JSON.parse(data);
    return Array.isArray(tasks) ? tasks : [];
  } catch (e) {
    console.error('Error reading pending tasks:', e.message);
    return [];
  }
}

/**
 * Save pending tasks
 */
function savePendingTasks(tasks) {
  fs.writeFileSync(PENDING_TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
}

/**
 * Mark a task as processed
 */
function markTaskProcessed(taskId) {
  const tasks = getPendingTasks();
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.status = 'processed';
    task.processedAt = new Date().toISOString();
    savePendingTasks(tasks);
    console.log(`Task ${taskId} marked as processed`);
  }
}

/**
 * Get next pending task
 */
function getNextPendingTask() {
  const tasks = getPendingTasks();
  return tasks.find(t => t.status === 'pending') || null;
}

/**
 * Read transcription file
 */
function readTranscription(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Transcription file not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Extract metadata and content
  const lines = content.split('\n');
  let transcription = '';
  let meetingId = 'unknown';
  let botId = 'unknown';
  let timestamp = '';
  
  for (const line of lines) {
    if (line.startsWith('# Meeting ID:')) {
      meetingId = line.replace('# Meeting ID:', '').trim();
    } else if (line.startsWith('# Bot ID:')) {
      botId = line.replace('# Bot ID:', '').trim();
    } else if (line.startsWith('# Timestamp:')) {
      timestamp = line.replace('# Timestamp:', '').trim();
    } else if (!line.startsWith('#')) {
      transcription += line + '\n';
    }
  }
  
  return {
    meetingId,
    botId,
    timestamp,
    content: transcription.trim()
  };
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'list':
      const tasks = getPendingTasks();
      console.log(JSON.stringify(tasks, null, 2));
      break;
      
    case 'next':
      const nextTask = getNextPendingTask();
      if (nextTask) {
        console.log(JSON.stringify(nextTask, null, 2));
      } else {
        console.log('No pending tasks');
      }
      break;
      
    case 'read':
      const taskArg = args[1];
      if (!taskArg) {
        console.error('Usage: node process-meeting.js read <task-id>');
        process.exit(1);
      }
      const task = getPendingTasks().find(t => t.id === taskArg);
      if (!task) {
        console.error(`Task not found: ${taskArg}`);
        process.exit(1);
      }
      const transcription = readTranscription(task.transcriptionPath);
      console.log(JSON.stringify(transcription, null, 2));
      break;
      
    case 'mark-processed':
      const taskId = args[1];
      if (!taskId) {
        console.error('Usage: node process-meeting.js mark-processed <task-id>');
        process.exit(1);
      }
      markTaskProcessed(taskId);
      break;
      
    default:
      console.log(`
Usage: node process-meeting.js <command>

Commands:
  list            List all pending tasks
  next            Get next pending task
  read <id>       Read transcription for a task
  mark-processed <id>  Mark a task as processed
`);
  }
}

module.exports = {
  getPendingTasks,
  getNextPendingTask,
  readTranscription,
  markTaskProcessed,
  savePendingTasks
};