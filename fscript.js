// script.js

let ws;
let startTime1 = '';
let endTime1 = '';

function connectWebSocket() {
  try {
    const connectionTimeout = setTimeout(() => {
      if (ws && ws.readyState === WebSocket.CONNECTING) {
        ws.close();
        handleConnectionError();
      }
    }, 10000); // 10 second timeout

    ws = new WebSocket('ws://localhost:3000');

    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      clearTimeout(connectionTimeout);
      handleConnect();
    };

    ws.onmessage = (event) => handleMessage(event);
    ws.onclose = () => {
      clearTimeout(connectionTimeout);
      handleDisconnect();
    };
    ws.onerror = (error) => handleError(error);
  } catch (error) {
    console.error('WebSocket connection error:', error);
    handleConnectionError();
  }
}

function handleConnect() {
  console.log('Upload WebSocket connected');
}

function handleMessage(event) {
  console.log('Received from server:', event.data);
  // document.getElementById('status').textContent += 'Server: ' + event.data;
  endTime1 = new Date();

  const diff = getDateDiff1(startTime1, endTime1);

	document.getElementById('status1').textContent = `Difference: ${diff.years} years, ${diff.months} months, ${diff.days} days, ${diff.hours} hours, ${diff.minutes} minutes, ${diff.seconds} seconds`;
}

function handleDisconnect() {
  console.log('WebSocket disconnected');
}

function handleError(error) {
  console.error('WebSocket error:', error);
}

function handleConnectionError() {
  console.error('WebSocket connection timeout or failed.');
}

const CHUNK_SIZE = 15 * 1024 * 1024; // 15 MB

function sendFileInChunks(file, fileId) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let offset = 0;
  let chunkIndex = 0;

  function sendNextChunk() {
    const blob = file.slice(offset, offset + CHUNK_SIZE);
    const reader = new FileReader();
    const sess = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    reader.onload = function (e) {
      if (ws.readyState === WebSocket.OPEN) {
        const header = JSON.stringify({
          action: 'chunk_upload',
          username: 'admin',
          fileId: fileId,
          fileName: file.name,
          sessionid: sess,
          chunkIndex: chunkIndex,
          totalChunks: totalChunks
        });

        const encoder = new TextEncoder();
        const headerBytes = encoder.encode(header);
        const headerLengthBuffer = new Uint32Array([headerBytes.length]).buffer;

        const chunkBuffer = new Uint8Array(e.target.result);

        const fullBuffer = new Uint8Array(4 + headerBytes.length + chunkBuffer.length);
        fullBuffer.set(new Uint8Array(headerLengthBuffer), 0);
        fullBuffer.set(headerBytes, 4);
        fullBuffer.set(chunkBuffer, 4 + headerBytes.length);

        ws.send(fullBuffer);
      }

      offset += CHUNK_SIZE;
      chunkIndex++;
      if (offset < file.size) {
        sendNextChunk();
      }
    };

    reader.readAsArrayBuffer(blob);
  }

  sendNextChunk();
}

// Handle submit
const submitBtn = document.getElementById('submitBtn');
submitBtn.addEventListener('click', () => {
  startTime1 = new Date();
  const message = document.getElementById('message').value;
  const files = document.getElementById('fileInput').files;

  if (!message.trim() && files.length === 0) {
    alert('Please provide a message or at least one file.');
    return;
  }

  if (ws.readyState !== WebSocket.OPEN) {
    alert('WebSocket is not connected yet. Please wait.');
    return;
  }

  const sess = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const fileNames = Array.from(files).map(file => file.name);
  const filesizes = Array.from(files).map(file => file.size);

  ws.send(JSON.stringify({ action: 'send_message', username: 'admin', roomid: 114, message: message, sessionid: sess, batchId: sess, size: filesizes, files: fileNames
}));

ws.addEventListener('message', function waitForFileIds(event) {
  try {
    const response = JSON.parse(event.data);
    if (response.status === 'completed' && response.phpOutput && response.phpOutput.send_message && response.phpOutput.send_message.files) {
      const fileMappings = response.phpOutput.send_message.files;
      console.log('fileMappings', fileMappings);
      for (const file of files) {
        const mapping = fileMappings.find(f => f.FileName == file.name);
        if (mapping) {
          sendFileInChunks(file, mapping.FileId);
        }
      }
      ws.removeEventListener('message', waitForFileIds);
    }
  } catch (err) {
    console.error('Error processing response:', err);
  }
});

  endTime1 = new Date();

  const diff = getDateDiff1(startTime1, endTime1);

	document.getElementById('status1').textContent += `Difference: ${diff.years} years, ${diff.months} months, ${diff.days} days, ${diff.hours} hours, ${diff.minutes} minutes, ${diff.seconds} seconds`;

});

function updateProgress() {
  const progress = Math.round((receivedChunks / expectedChunks) * 100);
  document.getElementById('progressBar').value = progress;
  document.getElementById('progressPercent').textContent = `${progress}%`;
}

function getDateDiff1(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();
  let days = endDate.getDate() - startDate.getDate();
  let hours = endDate.getHours() - startDate.getHours();
  let minutes = endDate.getMinutes() - startDate.getMinutes();
  let seconds = endDate.getSeconds() - startDate.getSeconds();

  if (seconds < 0) {
      seconds += 60;
      minutes--;
  }
  if (minutes < 0) {
      minutes += 60;
      hours--;
  }
  if (hours < 0) {
      hours += 24;
      days--;
  }
  if (days < 0) {
      const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
      days += prevMonth.getDate();
      months--;
  }
  if (months < 0) {
      months += 12;
      years--;
  }

  return { years, months, days, hours, minutes, seconds };
}

connectWebSocket();
