const WebSocket = require('ws');
const { spawn } = require('child_process');

// Store active processes and queue
const activeProcesses = new Map();
const requestQueue = [];
let runningProcesses = 0;
const MAX_CONCURRENT = 10;

const wss = new WebSocket.Server({ port: 3333 });

wss.on('connection', ws => {
  console.log('Client connected to OMS WebSocket server');

  ws.on('message', async message => {
    try {
      const jsonData = JSON.parse(message);
      console.log('Received JSON:', jsonData);

      // Generate a unique batch ID
      const batchId = jsonData.batchId || Date.now().toString();

      // Create request object
      const request = { ws, jsonData, batchId };

      // Check if we can process immediately or need to queue
      if (runningProcesses < MAX_CONCURRENT) {
        processRequest(request);
      } else {
        console.log(`Queueing request for batch ${batchId}, current running: ${runningProcesses}`);
        requestQueue.push(request);
      }

    } catch (error) {
      console.error('Error processing message:', error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ error: 'Invalid JSON' }));
      }
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Terminate associated processes
    activeProcesses.forEach((processInfo, pid) => {
      if (processInfo.ws === ws) {
        processInfo.child.kill();
        activeProcesses.delete(pid);
        runningProcesses--;
        console.log(`Terminated process ${pid} due to client disconnection`);
        // Process next queued request
        processNextFromQueue();
      }
    });
  });
});

// Process a single request
function processRequest({ ws, jsonData, batchId }) {
  try {
    runningProcesses++;
    console.log(`Processing batch ${batchId}, running: ${runningProcesses}`);

    // Prepare the PHP command
    const jsonString = JSON.stringify(jsonData).replace(/'/g, "\\'");
    const args = ['C:\\xampp\\htdocs\\6messenger\\omschat\\actions.php', `--param=${jsonString}`];

    // Spawn the PHP process
    const child = spawn('php', args);

    // Capture PID
    const pid = child.pid;
    console.log(`Started process for batch ${batchId} with PID: ${pid}`);

    // Store process info
    activeProcesses.set(pid, { ws, jsonData, batchId, child });

    // Capture output
    let phpOutput = '';
    child.stdout.on('data', (data) => {
      phpOutput += data.toString();
    });
    child.stderr.on('data', (data) => {
      phpOutput += data.toString();
    });

    // Handle process exit
    child.on('close', (code) => {
      console.log(`Process for batch ${batchId} with PID ${pid} finished with code ${code}`);

      // Send response to client
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          status: 'completed',
          pid: pid,
          batchId: batchId,
          originalData: jsonData,
          phpOutput: phpOutput.trim()
        }));
      } else {
        console.warn(`WebSocket closed for batch ${batchId}, PID ${pid}`);
      }

      // Clean up
      activeProcesses.delete(pid);
      runningProcesses--;
      console.log(`Process ${pid} ended, running: ${runningProcesses}`);

      // Process next queued request
      processNextFromQueue();
    });

  } catch (error) {
    console.error(`Error processing batch ${batchId}:`, error);
    runningProcesses--;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        error: 'Command execution failed',
        batchId,
        originalData: jsonData
      }));
    }
    processNextFromQueue();
  }
}

// Process the next request from the queue
function processNextFromQueue() {
  if (requestQueue.length > 0 && runningProcesses < MAX_CONCURRENT) {
    const nextRequest = requestQueue.shift();
    console.log(`Processing queued batch ${nextRequest.batchId}, queue length: ${requestQueue.length}`);
    processRequest(nextRequest);
  }
}

console.log('OMS WebSocket server running on ws://localhost:3333');