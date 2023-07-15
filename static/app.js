const textarea = document.querySelector('textarea');
const chatbox = document.getElementById("chatbox");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-btn");

function setScheme(scheme) {
  // Remove existing theme classes
  document.body.classList.remove('theme-1', 'theme-2', 'theme-3', 'theme-4', 'theme-5');

  // Add the selected theme class
  if (scheme === 1) {
    document.body.classList.add('theme-1');
  } else if (scheme === 2) {
    document.body.classList.add('theme-2');
  } else if (scheme === 3) {
    document.body.classList.add('theme-3');
  }
  else if (scheme === 4) {
    document.body.classList.add('theme-4');
  }
  else if (scheme === 5) {
    document.body.classList.add('theme-5');
  }
}

// Get all the buttons
const buttons = document.querySelectorAll('button');

// Function to add a bright white shadow to a button
function addShadow(button) {
  button.style.boxShadow = '0 0 10px 2px white';
}

// Function to remove the shadow from a button
function removeShadow(button) {
  button.style.boxShadow = '';
}

// Function to add shadows to the buttons in quick succession
function addShadows() {
  let index = 0;

  const intervalId = setInterval(() => {
    if (index >= buttons.length) {
      clearInterval(intervalId);
      setTimeout(resetButtons, 200); // Reset buttons after 2 seconds
      return;
    }

    addShadow(buttons[index]);
    index++;
  }, 200);
  
}

// Function to reset the buttons
function resetButtons() {
  buttons.forEach((button) => {
    removeShadow(button);
  });
}

// Start adding shadows to the buttons
addShadows();



textarea.addEventListener('input', () => {
  if (textarea.value === '') {
    textarea.style.height = 'auto'; // Reset the height to auto
  } else {
    textarea.style.height = 'auto'; // Reset the height to auto
    textarea.style.height = `${textarea.scrollHeight}px`; // Set the height to match the content
  }
});

let lastMessageElement = null;
// Function to add a message to the chatbox

function addMessage(role, content) {
  const messageElement = document.createElement("span");
  messageElement.classList.add(`${role}-message`);
  messageElement.innerHTML = content.split('\n').join('<br>'); // Replace newline characters with HTML line breaks
  chatbox.appendChild(messageElement);

  chatbox.scrollTo(0, chatbox.scrollHeight); // Always scroll to the bottom after adding a new message

  // Return the created element
  return messageElement;
}



console.log("hello");

let isAssistantResponding = false; // Global flag to indicate if the assistant is responding

async function sendMessage() {
  // Check if the assistant is responding
  if (isAssistantResponding) {
    return;
  }

  const userMessage = userInput.value;
  if (userMessage === '') {
    userInput.style.height = 'auto'; // Reset the height to auto
    return; // Exit the function if the user input is empty
  }

  addMessage("user", userMessage);
  userInput.value = "";
  userInput.style.height = 'auto'; // Reset the height to auto

  sendButton.disabled = true; // Disable the send button
  isAssistantResponding = true; // Set the flag to true



  const response = await fetch('/api/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: userMessage })
  });

  const reader = response.body.getReader();
  let assistantMessage = ''; // Variable to store the current assistant message
  let messageElement; // Variable to store the current message element

  while (true) {
    const { value, done } = await reader.read();
      // check if the user is within a reasonable distance (50 pixels) from the bottom
  if (chatbox.scrollHeight - chatbox.scrollTop <= chatbox.clientHeight + 50) {
    chatbox.scrollTo(0, chatbox.scrollHeight);
  }

    if (value) {
      let chunk = new TextDecoder().decode(value);
      console.log(chunk);

      assistantMessage += chunk; // Update the assistant message with the new chunk

      if (!messageElement) {
        // Create a new message element if it doesn't exist
        messageElement = addMessage("gpt", assistantMessage);
      } else {
        // Update the existing message element with the new chunk
        messageElement.innerText = assistantMessage;
      }
    }
    if (done) {
      sendButton.disabled = false; // Enable the send button
      isAssistantResponding = false; // Reset the flag
      break;
    }
  }
}



// Event listener for the send button
sendButton.addEventListener("click", sendMessage);

// Event listener for the textarea
textarea.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    if (!isAssistantResponding) { // Only send the message if the assistant is not responding
      sendMessage();
    }
  }
});

// Function to set the system message
async function setSystemMessage() {
  const systemMessage = document.getElementById("system-message").value;
  if (systemMessage === '') {
    return; // Exit the function if the system message input is empty
  }

  const response = await fetch('/api/set_system_message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: systemMessage })
  });

  if (response.ok) {
    console.log("System message set successfully");
  } else {
    console.error("Failed to set system message");
  }
}

// Function to fetch the chat history from the backend
async function fetchChatHistory() {
  const response = await fetch('/api/chat_history');
  const chatHistory = await response.json();

  for (let i = 0; i < chatHistory.length; i++) {
    const message = chatHistory[i];
    addMessage(message.role, message.content);
  }
}

// Call the function to fetch the chat history
fetchChatHistory();