
// chrome.commands.onCommand.addListener((command) => {
//     if (command === "summarize") {
//         chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//             if (tabs[0].id) {
//                 chrome.tabs.sendMessage(tabs[0].id, { action: "summarize" });
//             }
//         });
//     }
// });

// Listen for messages from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "summarize") {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText.length > 0) {
            // Create a popup immediately with 'Loading...' message
            let popup = document.getElementById('summarize-popup');
            if (!popup) {
                popup = document.createElement('div');
                popup.id = 'summarize-popup';
                popup.style.position = 'fixed';
                popup.style.top = '50%';
                popup.style.left = '50%';
                popup.style.transform = 'translate(-50%, -50%)';
                popup.style.backgroundColor = '#fff';
                popup.style.padding = '20px';
                popup.style.border = '1px solid #ccc';
                popup.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                popup.style.zIndex = '1000';
                popup.innerHTML = `<h2>Summary</h2><p>Loading...</p><button id="close-popup">Close</button>`;
                document.body.appendChild(popup);

                // Add event listener to close button
                document.getElementById('close-popup').addEventListener('click', function () {
                    popup.remove();
                    removeClickListener();
                });

                // Add event listener to close popup when clicking outside
                document.addEventListener('click', handleClickOutside);
            }

            // Function to handle clicks outside the popup
            function handleClickOutside(event) {
                if (!popup.contains(event.target)) {
                    popup.remove();
                    removeClickListener();
                }
            }

            // Function to remove the outside click listener
            function removeClickListener() {
                document.removeEventListener('click', handleClickOutside);
            }

            // Retrieve the OpenAI API key and system prompt from storage
            chrome.storage.local.get(['openaiApiKey', 'systemPrompt'], function (result) {
                const apiKey = result.openaiApiKey;
                const systemPrompt = result.systemPrompt || "You are a helpful assistant that summarizes text in two sentences.";
                if (!apiKey) {
                    alert('OpenAI API key is not set. Please set it in the extension popup.');
                    popup.remove();
                    removeClickListener();
                    return;
                }

                // Prepare the payload for OpenAI API with streaming enabled
                const payload = {
                    model: "gpt-4",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: selectedText }
                    ],
                    max_tokens: 4096,
                    temperature: 0.5,
                    stream: true
                };

                // Make the API request to OpenAI with streaming
                fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(payload)
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        const reader = response.body.getReader();
                        const decoder = new TextDecoder('utf-8');
                        let summary = '';

                        function readStream() {
                            return reader.read().then(({ done, value }) => {
                                if (done) {
                                    if (summary === '') {
                                        popup.querySelector('p').textContent = 'No summary received.';
                                    }
                                    return;
                                }
                                const chunk = decoder.decode(value, { stream: true });
                                // OpenAI streams responses as server-sent events (SSE)
                                const lines = chunk.split('\n').filter(line => line.trim() !== '');
                                for (const line of lines) {
                                    if (line.startsWith('data: ')) {
                                        const data = line.replace('data: ', '');
                                        if (data === '[DONE]') {
                                            return;
                                        }
                                        try {
                                            const parsed = JSON.parse(data);
                                            const delta = parsed.choices[0].delta.content;
                                            if (delta) {
                                                summary += delta;
                                                popup.querySelector('p').textContent = summary;
                                            }
                                        } catch (e) {
                                            console.error('Error parsing stream data:', e);
                                        }
                                    }
                                }
                                return readStream();
                            });
                        }

                        return readStream();
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        popup.querySelector('p').textContent = 'An error occurred while summarizing the text.';
                    });
            });
        }
    }
});
