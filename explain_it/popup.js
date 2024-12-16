document.getElementById("summarize").addEventListener("click", async () => {
    const textToSummarize = document.getElementById("inputText").value;

    if (!('ai' in self && 'summarizer' in self.ai)) {
        document.getElementById("outputSummary").textContent = "Summarizer API is not supported in this browser.";
        return;
    }

    const options = {
        sharedContext: "General",
        type: "key-points",
        format: "plain-text",
        length: "medium"
    };

    const capabilities = await self.ai.summarizer.capabilities();
    if (capabilities.available === 'readily') {
        const summarizer = await self.ai.summarizer.create(options);
        const summary = await summarizer.summarize(textToSummarize);
        document.getElementById("outputSummary").textContent = summary;
    } else {
        document.getElementById("outputSummary").textContent = "Summarizer model is not ready yet.";
    }
});
