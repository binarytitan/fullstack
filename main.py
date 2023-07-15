import json
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
import openai
import tiktoken

app = FastAPI()

# DEFINE YOUR OPEANAI API KEY
# openai.api_key = "YOUR_API_KEY"
openai.api_key = os.getenv("OPENAI_API_KEY")

#clear the messages file
with open("messages.json", "w") as f:
    json.dump([], f)

# allowing all origins and methods is not recommended for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# function to load, write the messages to a file
def load_write_messages(messages, write=False):
    if write:
        with open(MESSAGES_FILE, "w") as f:
            json.dump(messages, f)
    else:
        with open(MESSAGES_FILE, "r") as f:
            messages = json.load(f)
    return messages

# Define the function to count tokens
def count_tokens(text):
    encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
    return len(encoding.encode(text))

# Set the maximum token limit
MAX_MEMORY_TOKENS = 2000
MESSAGES_FILE = "messages.json"

if os.path.exists(MESSAGES_FILE):
    messages = load_write_messages([], write=False)
    messages.append({"role": "system", "content": "You are a helpful assistant."})
else:
    messages = [{"role": "system", "content": "You are a helpful assistant."}]
    messages = load_write_messages(messages, write=True)


@app.post("/api/set_system_message")
async def set_system_message(request: Request):  # Receive the system message from the request body
    data = await request.json()
    message = data.get('message')
    print(type(message))
    messages.append({"role": "system", "content": message})

@app.get("/api/chat_history")
async def chat_history():  # Return the chat history
    return messages

@app.post("/api/stream")
async def stream(request: Request):  # Receive the user's message from the request body
    data = await request.json()
    message = data.get('message')
    print(type(message))
    messages.append({"role": "user", "content": message})

    def event_stream():
        global messages  # We need to update the global variable inside this function
        print("start")

        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo-16k-0613",
            stream=True,
            messages=messages,
        )

        responses = ''

        for chunk in response:
            if "content" in chunk["choices"][0]["delta"]:
                r_text = chunk["choices"][0]["delta"]["content"]
                responses += r_text
                print(r_text, end='', flush=True)
                yield r_text

        messages.append({"role": "assistant", "content": responses})
        # Calculate the total tokens in the conversation history
        total_tokens = sum(count_tokens(message["content"]) for message in messages)
        # Remove the oldest messages from conversation history until total tokens are under the limit
        while total_tokens > MAX_MEMORY_TOKENS:
            if len(messages) > 2:
                removed_message = messages.pop(1)
                total_tokens -= count_tokens(removed_message["content"])
            else:
                break

        load_write_messages(messages, write=True)

    return StreamingResponse(event_stream(), media_type="text/event-stream")



app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)