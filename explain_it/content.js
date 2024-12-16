if (!('ai' in self && 'summarizer' in self.ai)) {
    console.log("Summarizer API is not supported in this browser.");
} else {
    const options = {
        sharedContext: "General",
        type: "key-points",
        format: "plain-text",
        length: "medium"
    };

    (async () => {
        const capabilities = await self.ai.summarizer.capabilities();
        if (capabilities.available === 'readily') {
            const summarizer = await self.ai.summarizer.create(options);
            const textToSummarize = document.body.innerText;
            const summary = await summarizer.summarize(textToSummarize);
            console.log("Summary:", summary);
        } else {
            console.log("Summarizer model is not ready yet.");
        }
    })();
}