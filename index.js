// Getting Elements from DOM
const joinButton = document.getElementById("joinBtn");
const leaveButton = document.getElementById("leaveBtn");
const toggleMicButton = document.getElementById("toggleMicBtn");
const toggleWebCamButton = document.getElementById("toggleWebCamBtn");
const createButton = document.getElementById("createMeetingBtn");
const videoContainer = document.getElementById("videoContainer");
const textDiv = document.getElementById("textDiv");

// Declare Variables
let meeting = null;
let meetingId = "";
let isMicOn = false;
let isWebCamOn = false;

// Function to Reset UI
function resetUI() {
  console.log("[RESET] Resetting UI...");
  document.getElementById("grid-screen").style.display = "none";
  document.getElementById("join-screen").style.display = "block";
  textDiv.textContent = "";
  videoContainer.innerHTML = "";
}

// Function to Show Popup Message
function showPopup(message) {
  const popup = document.createElement("div");
  popup.className = "popup";
  popup.innerHTML = `<p>${message}</p>`;

  document.body.appendChild(popup);

  setTimeout(() => {
    popup.remove();
  }, 3000);
}

// Join Meeting Button Event Listener
joinButton.addEventListener("click", async () => {
  document.getElementById("join-screen").style.display = "none";
  textDiv.textContent = "Joining the meeting...";

  roomId = document.getElementById("meetingIdTxt").value;
  meetingId = roomId;

  console.log(`[JOIN] Joining meeting with ID: ${meetingId}`);
  initializeMeeting();
});

// Create Meeting Button Event Listener
createButton.addEventListener("click", async () => {
  document.getElementById("join-screen").style.display = "none";
  textDiv.textContent = "Please wait, we are joining the meeting";

  console.log("[CREATE] Creating new meeting...");

  const url = `https://api.videosdk.live/v2/rooms`;
  const options = {
    method: "POST",
    headers: { Authorization: TOKEN, "Content-Type": "application/json" },
  };

  const { roomId } = await fetch(url, options)
    .then((response) => response.json())
    .catch((error) => {
      console.error("[ERROR] Creating meeting:", error);
      alert("Error creating meeting");
    });

  meetingId = roomId;
  console.log(`[CREATE] New Meeting Created with ID: ${meetingId}`);
  initializeMeeting();
});

// Initialize Meeting
function initializeMeeting() {
  console.log("[INIT] Initializing meeting...");

  window.VideoSDK.config(TOKEN);

  meeting = window.VideoSDK.initMeeting({
    meetingId: meetingId,
    name: "C.V.Raman",
    micEnabled: true,
    webcamEnabled: true,
    participantId: "pranav",
  });

  console.log("[INIT] Joining meeting...");
  meeting.join();

  // Event: Meeting Successfully Joined
  meeting.on("meeting-joined", () => {
    console.log("[JOINED] Meeting successfully joined!");
    textDiv.textContent = "";
    document.getElementById("grid-screen").style.display = "block";
    document.getElementById("meetingIdHeading").textContent = `Meeting Id: ${meetingId}`;
    createLocalParticipant();
  });

  // Event: Meeting Left
  meeting.on("meeting-left", () => {
    console.log("[LEFT] Meeting left. Resetting UI...");
    resetUI();
    meeting = null;
  });

  // Event: Error Handling
  meeting.on("error", (error) => {
    console.error("[ERROR] Meeting Error:", error);

    if (error.code === 4005) {
      console.log("[ERROR 4005] Duplicate participant ID detected. Leaving meeting...");

      showPopup("You are trying to join the meeting somewhere else, so leaving from here.");

      meeting.leave().then(() => {
        console.log("[ERROR 4005] Successfully left meeting. Resetting UI...");
        resetUI();
        meeting = null;
      }).catch((err) => {
        console.error("[ERROR 4005] Failed to leave meeting:", err);
      });
    }
  });

  // Event: Participant Joined
  meeting.on("participant-joined", (participant) => {
    console.log(`Participant joined: ${participant.id}`);

    let videoElement = createVideoElement(participant.id, participant.displayName);
    let audioElement = createAudioElement(participant.id);

    participant.on("stream-enabled", (stream) => {
      console.log(`Stream enabled for ${participant.id}: ${stream.kind}`);
      setTrack(stream, audioElement, participant, false);
    });

    videoContainer.appendChild(videoElement);
    videoContainer.appendChild(audioElement);
  });

  // Event: Participant Left
  meeting.on("participant-left", (participant) => {
    console.log(`Participant left: ${participant.id}`);

    let vElement = document.getElementById(`f-${participant.id}`);
    if (vElement) vElement.remove();

    let aElement = document.getElementById(`a-${participant.id}`);
    if (aElement) aElement.remove();
  });

  // Event: Local Participant Stream Enabled
  meeting.localParticipant.on("stream-enabled", (stream) => {
    console.log(`Stream enabled: ${stream.kind}`);
    setTrack(stream, null, meeting.localParticipant, true);
  });
}

// Creating Local Participant
function createLocalParticipant() {
  let localParticipant = createVideoElement(meeting.localParticipant.id, meeting.localParticipant.displayName);
  videoContainer.appendChild(localParticipant);
}

// Creating Video Element
function createVideoElement(pId, name) {
  let videoFrame = document.createElement("div");
  videoFrame.setAttribute("id", `f-${pId}`);

  let videoElement = document.createElement("video");
  videoElement.classList.add("video-frame");
  videoElement.setAttribute("id", `v-${pId}`);
  videoElement.setAttribute("playsinline", true);
  videoElement.setAttribute("width", "300");
  videoFrame.appendChild(videoElement);

  let displayName = document.createElement("div");
  displayName.innerHTML = `Name : ${name}`;
  videoFrame.appendChild(displayName);
  return videoFrame;
}

// Creating Audio Element
function createAudioElement(pId) {
  let audioElement = document.createElement("audio");
  audioElement.setAttribute("autoPlay", "false");
  audioElement.setAttribute("playsInline", "true");
  audioElement.setAttribute("controls", "false");
  audioElement.setAttribute("id", `a-${pId}`);
  audioElement.style.display = "none";
  return audioElement;
}

// Setting Media Track
function setTrack(stream, audioElement, participant, isLocal) {
  console.log(`Setting track for ${participant.id}: ${stream.kind}`);

  if (stream.kind == "video") {
    isWebCamOn = true;
    const mediaStream = new MediaStream();
    mediaStream.addTrack(stream.track);
    let videoElm = document.getElementById(`v-${participant.id}`);
    videoElm.srcObject = mediaStream;
    videoElm.play().catch((error) => console.error("videoElem.play() failed", error));
  }
  if (stream.kind == "audio") {
    if (isLocal) {
      isMicOn = true;
    } else {
      const mediaStream = new MediaStream();
      mediaStream.addTrack(stream.track);
      audioElement.srcObject = mediaStream;
      audioElement.play().catch((error) => console.error("audioElem.play() failed", error));
    }
  }
}

// Leave Meeting Button Event Listener
leaveButton.addEventListener("click", async () => {
  console.log("Leave button clicked. Leaving meeting...");
  meeting?.leave().then(() => {
    console.log("Successfully left meeting.");
    resetUI();
    meeting = null;
  }).catch((err) => {
    console.error("Failed to leave meeting:", err);
  });
});
