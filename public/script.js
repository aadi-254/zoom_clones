
// Initialize PeerJS and Socket.IO
const socket = io();
const peer = new Peer();
let peerIds = new Set();
let localStream;
const remoteStreams = {};

// PeerJS: Handle open event
peer.on('open', (id) => {
    console.log('My peer ID is:', id);
    socket.emit("id-got", id);
});

// Socket.IO: Handle new peer connection
socket.on("id", (anotherPeerId) => {
    if (!peerIds.has(anotherPeerId)) {
        peerIds.add(anotherPeerId);
        connectToPeer(anotherPeerId);
    }
});

// Connect to another peer
function connectToPeer(anotherPeerId) {
    getLocalStream().then((stream) => {
        const call = peer.call(anotherPeerId, stream);
        addRemoteVideo(call, anotherPeerId);
    });
}

// Handle incoming calls
peer.on('call', (call) => {
    getLocalStream().then((stream) => {
        call.answer(stream);
        addRemoteVideo(call, call.peer);
    });
});

// Get local media stream
function getLocalStream() {
    return navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
            if (!localStream) {
                localStream = stream;
                document.getElementById('localVideo').srcObject = stream;
            }
            return stream;
        })
        .catch((err) => {
            console.error('Failed to get local stream', err);
            alert('Unable to access camera or microphone. Please check your settings.');
        });
}

// Add remote video to the container
function addRemoteVideo(call, peerId) {
    const videoContainer = document.getElementById('video-container');
    const videoElement = document.createElement('video');
    videoElement.id = `remoteVideo_${peerId}`;
    videoElement.autoplay = true;
    videoElement.className = "userVideo";
    videoContainer.appendChild(videoElement);

    call.on('stream', (remoteStream) => {
        remoteStreams[peerId] = remoteStream;
        videoElement.srcObject = remoteStream;
    });

    call.on('close', () => removeRemoteVideo(peerId));
}

// Remove remote video
function removeRemoteVideo(peerId) {
    const videoElement = document.getElementById(`remoteVideo_${peerId}`);
    if (videoElement) videoElement.remove();
    peerIds.delete(peerId);
    delete remoteStreams[peerId];
}

socket.on("user-disconnected", removeRemoteVideo);

// Media controls
function toggleMediaTrack(trackType, enable) {
    const track = localStream?.getTracks().find(t => t.kind === trackType);
    if (track) track.enabled = enable;
}

document.getElementById('stop-video-btn').addEventListener('click', () => {
    toggleMediaTrack('video', false);
    toggleButtonDisplay('stop-video-btn', 'start-video-btn');
});

document.getElementById('start-video-btn').addEventListener('click', () => {
    toggleMediaTrack('video', true);
    toggleButtonDisplay('start-video-btn', 'stop-video-btn');
});

document.getElementById('stop-audio-btn').addEventListener('click', () => {
    toggleMediaTrack('audio', false);
    toggleButtonDisplay('stop-audio-btn', 'start-audio-btn');
});

document.getElementById('start-audio-btn').addEventListener('click', () => {
    toggleMediaTrack('audio', true);
    toggleButtonDisplay('start-audio-btn', 'stop-audio-btn');
});

function toggleButtonDisplay(hideId, showId) {
    document.getElementById(hideId).style.display = 'none';
    document.getElementById(showId).style.display = 'block';
}

// Chat functionality
const messages = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
let username;

do {
    username = prompt("Enter your name:");
} while (!username || username.trim() === '');

function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('chat message', { user: username, msg: message });
        messageInput.value = '';
    }
}

sendButton.addEventListener('click', sendMessage);
document.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') sendMessage();
});

socket.on('chat message', (data) => {
    const item = document.createElement('li');
    item.style.margin='10px';
    item.style.width='86%';
    item.style.wordWrap = 'break-word'; // Break words if they are too long
item.style.overflowWrap = 'break-word'; // Similar behavior for older browsers
item.style.overflow = 'hidden'; // Ensure content doesn't visually overflow
item.style.textOverflow = 'ellipsis'; // Optionally, add ellipsis for overflowed text

    item.style.padding='5px'
    item.className = data.user === username ? 'my-message' : 'other-message';
    item.textContent = `${data.user}: ${data.msg}`;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight; // Scroll to the latest message
});
