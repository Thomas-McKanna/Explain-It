
    
        
// Listen for messages from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "summarize") {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText.length > 0) {
            // Load the summarization HTML from summarize.html
            fetch(chrome.runtime.getURL('summarize.html'))
                .then(response => response.text())
                .then(html => {
                    let popup = document.getElementById('summarize-popup');
                    if (!popup) {
                        popup = document.createElement('div');
                        popup.id = 'summarize-popup';
                        popup.innerHTML = html;
                        document.body.appendChild(popup);

                        // Add event listener to close button
                        document.getElementById('close-popup').addEventListener('click', function () {
                            popup.remove();
                            removeClickListener();
                        });

                        // Add event listener to copy markdown button
                        document.getElementById('copy-markdown').addEventListener('click', function () {
                            const summaryMarkdown = popup.getAttribute('data-summary');
                            if (summaryMarkdown) {
                                navigator.clipboard.writeText(summaryMarkdown).then(() => {
                                    alert('Summary copied to clipboard!');
                                }).catch(err => {
                                    console.error('Failed to copy summary: ', err);
                                });
                            }
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

                    // Set the loading message
                    popup.querySelector('.popup-content').innerHTML = `<p>Loading...</p>`;

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
                                                popup.querySelector('.popup-content').innerHTML = '<p>No summary received.</p>';
                                            }
                                            // Store the summary in a data attribute for copying
                                            popup.setAttribute('data-summary', summary);
                                            return;
                                        }
                                        const chunk = decoder.decode(value, { stream: true });
                                        // OpenAI streams responses as server-sent events (SSE)
                                        const lines = chunk.split('\n').filter(line => line.trim() !== '');
                                        for (const line of lines) {
                                            if (line.startsWith('data: ')) {
                                                const data = line.replace('data: ', '');
                                                if (data === '[DONE]') {
                                                    // Store the summary in a data attribute for copying
                                                    popup.setAttribute('data-summary', summary);
                                                    return;
                                                }
                                                try {
                                                    const parsed = JSON.parse(data);
                                                    const delta = parsed.choices[0].delta.content;
                                                    if (delta) {
                                                        summary += delta;
                                                        const markdownContent = marked.parse(summary);
                                                        popup.querySelector('.popup-content').innerHTML = markdownContent;
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
                                popup.querySelector('.popup-content').innerHTML = '<p>An error occurred while summarizing the text.</p>';
                            });
                    });
                })
                .catch(error => {
                    console.error('Error loading summarize.html:', error);
                });
        }
    }
});

