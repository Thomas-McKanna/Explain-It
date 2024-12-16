
document.addEventListener('DOMContentLoaded', function () {
    const apiKeyInput = document.getElementById('apiKey');
    const systemPromptInput = document.getElementById('systemPrompt');
    const saveButton = document.getElementById('saveSettings');
    const statusDiv = document.getElementById('status');
    const errorDiv = document.getElementById('error');

    // Load the API key and system prompt from storage
    chrome.storage.local.get(['openaiApiKey', 'systemPrompt'], function (result) {
        if (result.openaiApiKey) {
            apiKeyInput.value = result.openaiApiKey;
        }
        if (result.systemPrompt) {
            systemPromptInput.value = result.systemPrompt;
        }
    });

    // Save the API key and system prompt to storage
    saveButton.addEventListener('click', function () {
        const apiKey = apiKeyInput.value.trim();
        const systemPrompt = systemPromptInput.value.trim();

        if (!apiKey) {
            errorDiv.textContent = 'API key cannot be empty.';
            statusDiv.textContent = '';
            return;
        }

        if (!systemPrompt) {
            errorDiv.textContent = 'System prompt cannot be empty.';
            statusDiv.textContent = '';
            return;
        }

        chrome.storage.local.set({ 'openaiApiKey': apiKey, 'systemPrompt': systemPrompt }, function () {
            if (chrome.runtime.lastError) {
                errorDiv.textContent = 'Error saving settings: ' + chrome.runtime.lastError.message;
                statusDiv.textContent = '';
            } else {
                statusDiv.textContent = 'Settings saved successfully.';
                errorDiv.textContent = '';
            }
        });
    });
});
