const ws = new WebSocket("ws://localhost:3000");
let sessionid = "sess_1753164020267_j31gj811g"; // Set statically or retrieve dynamically
let username = "admin";     // Set statically or retrieve dynamically
let totalIndex = 0;

ws.onopen = () => {
  console.log("WebSocket connection established");
};

ws.onmessage = (message) => {
  const data = JSON.parse(message.data);

  if (data.originalData.action === 'get_message_files') {
    const files = data?.phpOutput?.get_message_files?.message_files;
    if (Array.isArray(files)) {
      renderFileList(files);
    } else {
      alert("No files returned or wrong response format.");
      console.warn("Unexpected response structure:", data);
    }
  }

  if (data.originalData.action === 'get_max_chunkindex') {
    const max_chunkindex = data.phpOutput.get_max_chunkindex.max_chunkindex[0];
    if ( data.phpOutput.get_max_chunkindex.code == 2 ) {
      console.log('fileId', max_chunkindex.FileId);
      const fileLink = document.getElementById(`link-${max_chunkindex.FileId}`);
      // fileLink.innerHTML = `<a href="http://localhost:8000/chatapi.php?fileId=${max_chunkindex.FileId}&username=${username}&sessionid=${sessionid}&action=file_download" target="_blank">Click here to download</a>`;
      // fileLink.innerHTML = `<button onclick="downloadFilePOST('${max_chunkindex.FileId}', '${username}', '${sessionid}')">Click here to download</button>`;
      fileLink.innerHTML = `<a href="#" onclick="downloadFilePOST('${max_chunkindex.FileId}', '${username}', '${sessionid}'); return false;">Click here to download</a>`;
    } else {
      assembleChunks(max_chunkindex);
    }
  }

  if (data.originalData.action === 'chunk_assemble') {
    totalIndex++;
    const chunk_assemble = data.phpOutput.chunk_assemble;
    updateProgress(chunk_assemble.fileId, chunk_assemble.chunkIndex, chunk_assemble.totalChunks);
    console.log('chunkIndex', chunk_assemble.chunkIndex, 'totalChunks', chunk_assemble.totalChunks, 'totalIndex', totalIndex);
    if (totalIndex == chunk_assemble.totalChunks) {
        ws.send(JSON.stringify({
        action: "chunk_assemble",
        username,
        sessionid,
        chunkIndex: totalIndex,
        totalChunks: chunk_assemble.totalChunks,
        fileName: chunk_assemble.fileName,
        fileId: chunk_assemble.fileId
      }));
    } else if (chunk_assemble.chunkIndex == chunk_assemble.totalChunks) {
        const fileLink = document.getElementById(`link-${chunk_assemble.fileId}`);
        // fileLink.innerHTML = `<button onclick="downloadFilePOST('${chunk_assemble.fileId}', '${username}', '${sessionid}')">Click here to download</button>`;
        // fileLink.innerHTML = `<a href="http://localhost:8000/chatapi.php?fileId=${chunk_assemble.fileId}&username=${username}&sessionid=${sessionid}&action=file_download" target="_blank">Click here to download</a>`;
        fileLink.innerHTML = `<a href="#" onclick="downloadFilePOST('${chunk_assemble.FileId}', '${username}', '${sessionid}'); return false;">Click here to download</a>`;
    }
  }
};

document.getElementById("joinBtn").addEventListener("click", () => {
  const roomid = document.getElementById("roomid").value;
  console.log("Sending request to fetch files for room:", roomid);
  if (!roomid) return alert("Room ID required");

  ws.send(JSON.stringify({
    action: "get_message_files",
    username,
    sessionid,
    roomid
  }));
});

function renderFileList(files) {
  const container = document.getElementById("fileList");
  container.innerHTML = "";

  files.forEach(file => {
    const wrapper = document.createElement("div");
    wrapper.className = "file-item";

    wrapper.innerHTML = `
      <div>
        <strong>${file.FileName}</strong>
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress" id="progress-${file.FileId}"></div>
          </div>
        </div>
        <div id="link-${file.FileId}" class="download-link"></div>
      </div>
      <button onclick="startDownload('${file.FileId}')">⬇️</button>
    `;

    container.appendChild(wrapper);
  });
}

function startDownload(fileId) {
  ws.send(JSON.stringify({
    action: "get_max_chunkindex",
    username,
    sessionid,
    fileId
  }));
}

function assembleChunks(max_chunkindex) {
  let current = 0;
  const fileId = max_chunkindex.FileId;
  const maxChunk = max_chunkindex.maxchunk + 1;
  const fileName = max_chunkindex.FileName;
  function loopChunks() {
    if (current > maxChunk - 1) {
    //   ws.send(JSON.stringify({
    //     action: "chunk_assemble",
    //     username,
    //     sessionid,
    //     chunkIndex: current,
    //     totalChunks: maxChunk,
    //     fileName,
    //     fileId
    //   }));
    //   console.log('chunk_assemble', current);
      return;
    }
    console.log('chunk_assemble', current);
    // simulate chunk processing (replace this with actual request if needed)
    ws.send(JSON.stringify({
      action: "chunk_assemble",
      username,
      sessionid,
      chunkIndex: current,
      totalChunks: maxChunk,
      fileName,
      fileId
    }));

    current++;
    setTimeout(loopChunks, 100); // simulate delay
  }

  loopChunks();
}

function updateProgress(fileId, current, max) {
  const percent = Math.round((current / max) * 100);
  const bar = document.getElementById(`progress-${fileId}`);
  if (bar) bar.style.width = `${percent}%`;
}

function downloadFilePOST(fileId, username, sessionid) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'http://localhost:8000/chatapi.php';
  form.target = '_blank'; // Opens in new tab (like <a target="_blank">)

  form.style.display = 'none';

  const jsonPayload = {
    action: 'file_download',
    fileId,
    username,
    sessionid
  };

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'json';
  input.value = JSON.stringify(jsonPayload);
  console.log('jsonPayload', jsonPayload);
  form.appendChild(input);
  console.log('form', form);
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

function checkFilePOST(fileId, username, sessionid) {
  const checkPayload = {
    action: 'file_download_check',
    fileId,
    username,
    sessionid
  };

  // Send check request to PHP backend via WebSocket
  ws.send(JSON.stringify(checkPayload));
}