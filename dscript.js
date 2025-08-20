// fdownload.js

let wsDownload;
let downloadChunks = [];
let expectedChunks = 0;
let receivedChunks = 0;
let downloadSession = '';
let startTime2 = '';
let endTime2 = '';
let fileStream;
let writableStream;
let downloadStage = 'prepare'; // or 'save'
let tempFileName = '';
let nextExpectedChunkIndex = 0;
const pendingChunks = new Map();
let currentChunkIndex = 0;
const maxConcurrentRequests = 15;

function startControlledChunkRequests(FileName) {
  startTime2 = new Date();
  activeRequests = 0;
  currentChunkIndex = 0;
  nextExpectedChunkIndex = 0;
  pendingChunks.clear();
  console.log(`Total chunk: ${expectedChunks}`, "Current keys in map:", [...pendingChunks.keys()]);
  wsDownload.addEventListener('message', handleChunkMessage);

  // Launch the first batch:
  for (let i = 0; i < maxConcurrentRequests; i++) {
    requestNextChunk(FileName);
  }
}

function requestNextChunk(FileName) {
  if (currentChunkIndex >= expectedChunks) return;

  const chunkIndex = currentChunkIndex++;
  activeRequests++;
  console.log(`currentChunkIndex:`,currentChunkIndex, `activeRequests: ${activeRequests}`);
  sendChunkRequest(FileName, chunkIndex);
}

async function handleChunkMessage(event) {
  if (!(event.data instanceof ArrayBuffer)) return;

  const buffer = new Uint8Array(event.data);
  const headerLength = new DataView(buffer.buffer).getUint32(0, true);
  const headerBytes = buffer.slice(4, 4 + headerLength);
  const headerJson = new TextDecoder().decode(headerBytes);
  const header = JSON.parse(headerJson);
  const chunkBuffer = buffer.slice(4 + headerLength);
  const chunkIndex = header.chunk_download.chunkIndex;
  
  pendingChunks.set(chunkIndex, chunkBuffer);
  console.log("chunk keys in map:", [...pendingChunks.keys()]);
  if (pendingChunks.has(nextExpectedChunkIndex)) {
    try {
      await processPendingChunks();
  } catch (e) {
      console.error("Error during processPendingChunks call:", e);
      // Handle error if necessary
  }
  }

  activeRequests--;
  console.log(`Received chunk:`,chunkIndex, `activeRequests: ${activeRequests}`);
  if (currentChunkIndex < expectedChunks) {
    requestNextChunk(header.chunk_download.FileName);
  }
}

function sendChunkRequest(FileName, chunkIndex) {
  wsDownload.send(JSON.stringify({
    action: 'chunk_download',
    fileId: document.getElementById('downloadFileId').value.trim(),
    chunkIndex: chunkIndex,
    FileName: FileName,
    totalChunks : expectedChunks,
    username: 'admin',
    sessionid: downloadSession,
    batchId: downloadSession
  }));
}

// async function processPendingChunks() {
//   while (pendingChunks.has(nextExpectedChunkIndex)) {
//     const buffer = pendingChunks.get(nextExpectedChunkIndex);
//     await writableStream.write(buffer);
//     pendingChunks.delete(nextExpectedChunkIndex);

//     nextExpectedChunkIndex++;
//     receivedChunks++;
//     updateProgress();
//     console.log(`In map: ${pendingChunks.size}, In file: ${nextExpectedChunkIndex}`);
//     console.log("Current keys in map:", [...pendingChunks.keys()]);
//     if (receivedChunks === expectedChunks) {
//       await writableStream.close();
//       wsDownload.removeEventListener('message', handleChunkMessage);
//       endTime2 = new Date();

//       const diff = getDateDiff2(startTime2, endTime2);

//       document.getElementById('status2').textContent += `Difference: ${diff.years} years, ${diff.months} months, ${diff.days} days, ${diff.hours} hours, ${diff.minutes} minutes, ${diff.seconds} seconds`;
//       console.log("Download complete.");
//     }
//   }
// }

async function processPendingChunks() {
  console.log(`[PROCESS_START] nextExpectedChunkIndex: ${nextExpectedChunkIndex}, receivedChunks: ${receivedChunks}, map size: ${pendingChunks.size}, map keys: ${[...pendingChunks.keys()]}`);

  let processedThisPass = 0;
  while (pendingChunks.has(nextExpectedChunkIndex)) {
      const buffer = pendingChunks.get(nextExpectedChunkIndex);
      try {
          await writableStream.write(buffer);
          pendingChunks.delete(nextExpectedChunkIndex);
          nextExpectedChunkIndex++;
          receivedChunks++;
          processedThisPass++;
          updateProgress();
          console.log(`[CHUNK_WRITTEN] Index: ${nextExpectedChunkIndex - 1}, Received: ${receivedChunks}, Map size: ${pendingChunks.size}`);
      } catch (error) {
          console.error(`Error writing chunk ${nextExpectedChunkIndex} to stream:`, error);
          // Decide how to handle this error: retry? abort?
          // Don't increment nextExpectedChunkIndex/receivedChunks if write fails.
          break; // Stop processing contiguous chunks if one fails
      }
  }

  console.log(`[PROCESS_END] Processed ${processedThisPass} chunks. nextExpectedChunkIndex: ${nextExpectedChunkIndex}, receivedChunks: ${receivedChunks}, map size: ${pendingChunks.size}, map keys: ${[...pendingChunks.keys()]}`);


  if (receivedChunks === expectedChunks) {
      console.log(`[COMPLETION_CHECK] receivedChunks (${receivedChunks}) === expectedChunks (${expectedChunks})`);
      if (writableStream) { // Ensure stream exists before closing
        await writableStream.close();
      }
      // Only remove listener IF we are absolutely sure no more processing is needed.
      // A slight delay here might reveal more late-arriving chunks *before* removal.
      wsDownload.removeEventListener('message', handleChunkMessage);
      endTime2 = new Date();
      const diff = getDateDiff2(startTime2, endTime2);
      document.getElementById('status2').textContent += `Difference: ${diff.years} years, ${diff.months} months, ${diff.days} days, ${diff.hours} hours, ${diff.minutes} minutes, ${diff.seconds} seconds`;
      console.log("Download complete.");
      // You might want to clear pendingChunks here, as they are now useless.
      pendingChunks.clear(); // Ensure it's truly empty after completion
  }
}

function connectDownloadWebSocket() {
  wsDownload = new WebSocket('ws://localhost:3000');
  wsDownload.binaryType = 'arraybuffer';

  wsDownload.onopen = () => console.log('Download WebSocket connected');
  wsDownload.onmessage = handleDownloadMessage;
  wsDownload.onclose = () => console.log('Download WebSocket disconnected');
  wsDownload.onerror = (error) => console.error('Download WebSocket error:', error);
}

function handleDownloadMessage(event) {
  if (typeof event.data === 'string') {
    try {
      const response = JSON.parse(event.data);
      if (response.phpOutput && response.phpOutput.get_max_chunkindex) {
        const maxChunk = response.phpOutput.get_max_chunkindex.max_chunkindex?.[0]?.maxchunk;
        FileName = response.phpOutput.get_max_chunkindex.max_chunkindex?.[0]?.FileName;
        if (maxChunk !== undefined) {
          tempFileName = FileName;
          downloadBtn = document.getElementById('downloadBtn');
          downloadBtn.textContent = `Save As ${FileName}`;
          downloadStage = 'save';
          downloadBtn.disabled = false;
          expectedChunks = maxChunk + 1;
          downloadChunks = new Array(expectedChunks);
          receivedChunks = 0;
          // sendChunkDownloadRequests(FileName);
        }
      }
    } catch {
      console.log('Server message:', event.data);
    }
  } else {
    // const buffer = new Uint8Array(event.data);
    // const headerLength = new DataView(buffer.buffer).getUint32(0, true);
    // const headerBytes = buffer.slice(4, 4 + headerLength);
    // const headerJson = new TextDecoder().decode(headerBytes);
    // const header = JSON.parse(headerJson);

    // const chunkBuffer = buffer.slice(4 + headerLength);

    // const chunkIndex = header.chunk_download.chunkIndex;
    // downloadChunks[chunkIndex] = chunkBuffer;
    // receivedChunks++;
    // console.log('Server message:', event.data);
    // console.log(`Received chunk`,header, `size: ${chunkBuffer.length}`);
    // updateProgress();
    // if (receivedChunks === expectedChunks) combineChunksAndSave(FileName);
  }
}

function updateProgress() {
  const progress = Math.round((receivedChunks / expectedChunks) * 100);
  document.getElementById('progressBar').value = progress;
  document.getElementById('progressPercent').textContent = `${progress}%`;
}

document.getElementById('downloadBtn').addEventListener('click', async () => {
  if (downloadStage === 'prepare') {
    startTime2 = new Date();
    const fileId = document.getElementById('downloadFileId').value.trim();
    if (!fileId) return alert('Enter a valid File ID.');
    // const handle = await window.showSaveFilePicker({
    //   suggestedName: `downloaded_file.bin`
    // });
    // writableStream = await handle.createWritable();
    downloadBtn.disabled = true;
    if (!wsDownload || wsDownload.readyState !== WebSocket.OPEN) connectDownloadWebSocket();
    downloadSession = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    wsDownload.send(JSON.stringify({
      action: 'get_max_chunkindex',
      username: 'admin',
      sessionid: downloadSession,
      batchId: downloadSession,
      fileId: fileId
    }));
  } else if (downloadStage === 'save') {
    const handle = await window.showSaveFilePicker({ suggestedName: tempFileName });
    writableStream = await handle.createWritable();
    
    // Now trigger chunk download requests here.
    // sendChunkDownloadRequests(tempFileName);
    // setupDownloadProcess(tempFileName);
    startControlledChunkRequests(tempFileName);
    downloadBtn.disabled = true;
  }
});

function getDateDiff2(start, end) {
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

connectDownloadWebSocket();

// function setupDownloadProcess(FileName) {
//   nextExpectedChunkIndex = 0;
//   receivedChunks = 0;
//   pendingChunks.clear();

//   wsDownload.addEventListener('message', handleChunkMessage);

//   for (let i = 0; i < expectedChunks; i++) {
//     sendChunkRequest(FileName, i);
//   }
// }

// async function handleChunkMessage(event) {
//   if (!(event.data instanceof ArrayBuffer)) return;

//   const buffer = new Uint8Array(event.data);
//   const headerLength = new DataView(buffer.buffer).getUint32(0, true);
//   const headerBytes = buffer.slice(4, 4 + headerLength);
//   const headerJson = new TextDecoder().decode(headerBytes);
//   const header = JSON.parse(headerJson);
//   const chunkBuffer = buffer.slice(4 + headerLength);
//   const chunkIndex = header.chunk_download.chunkIndex;

//   pendingChunks.set(chunkIndex, chunkBuffer);
//   processPendingChunks();
// }

// function sendChunkDownloadRequests(FileName) {
//   for (let i = 0; i < expectedChunks; i++) {
//     wsDownload.send(JSON.stringify({
//       action: 'chunk_download',
//       fileId: document.getElementById('downloadFileId').value.trim(),
//       chunkIndex: i,
//       FileName: FileName,
//       username: 'admin',
//       sessionid: downloadSession,
//       batchId: downloadSession
//     }));
//   }
// }

// function combineChunksAndSave(FileName) {
//   const blob = new Blob(downloadChunks);
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement('a');
//   a.href = url;
//   a.download = FileName;
//   document.body.appendChild(a);
//   a.click();
//   document.body.removeChild(a);
//   URL.revokeObjectURL(url);
//   // document.getElementById('downloadStatus').textContent = 'Download complete';
//   endTime2 = new Date();

//   const diff = getDateDiff2(startTime2, endTime2);

// 	document.getElementById('status2').textContent += `Difference: ${diff.years} years, ${diff.months} months, ${diff.days} days, ${diff.hours} hours, ${diff.minutes} minutes, ${diff.seconds} seconds`;
// }

// function sendChunkDownloadRequests(FileName) {
//   let currentChunkIndex = 0;
//   let activeRequests = 0;
//   const maxConcurrentRequests = 15;

//   function requestNextChunk() {
//     if (currentChunkIndex >= expectedChunks) return;
//     if (activeRequests >= maxConcurrentRequests) return;

//     const chunkIndex = currentChunkIndex++;
//     activeRequests++;

//     wsDownload.send(JSON.stringify({
//       action: 'chunk_download',
//       fileId: document.getElementById('downloadFileId').value.trim(),
//       chunkIndex: chunkIndex,
//       FileName: FileName,
//       username: 'admin',
//       sessionid: downloadSession,
//       batchId: downloadSession
//     }));
//   }

  // wsDownload.addEventListener('message', async function onChunkReceived(event) {
  //   if (!(event.data instanceof ArrayBuffer)) return;

  //   const buffer = new Uint8Array(event.data);
  //   const headerLength = new DataView(buffer.buffer).getUint32(0, true);
  //   const headerBytes = buffer.slice(4, 4 + headerLength);
  //   const headerJson = new TextDecoder().decode(headerBytes);
  //   const header = JSON.parse(headerJson);
  //   const chunkBuffer = buffer.slice(4 + headerLength);
  //   const chunkIndex = header.chunk_download.chunkIndex;
  //   // downloadChunks[chunkIndex] = chunkBuffer;

  //   // if (chunkIndex === 0 && !writableStream) {
  //   //   await setupFileStream(header.chunk_download.FileName);
  //   // }
  
  //   // Write directly to file
  //   await writableStream.write(chunkBuffer);

  //   receivedChunks++;
  //   activeRequests--;
  //   console.log(`expectedChunks`,expectedChunks, `receivedChunks: ${receivedChunks}`);
  //   updateProgress();

  //   if (receivedChunks === expectedChunks) {
  //     await writableStream.close();
  //     endTime2 = new Date();

  //     const diff = getDateDiff2(startTime2, endTime2);

	//     document.getElementById('status2').textContent += `Difference: ${diff.years} years, ${diff.months} months, ${diff.days} days, ${diff.hours} hours, ${diff.minutes} minutes, ${diff.seconds} seconds`;
  //     // combineChunksAndSave(FileName);
  //     wsDownload.removeEventListener('message', onChunkReceived);
  //   } else {
  //     requestNextChunk();
  //   }
  // });
// 
//   for (let i = 0; i < maxConcurrentRequests; i++) {
//     requestNextChunk();
//   }
// }

// async function setupFileStream(filename) {
//   const handle = await window.showSaveFilePicker({
//     suggestedName: filename,
//   });
//   writableStream = await handle.createWritable();
// }

