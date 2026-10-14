
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`;

/* ------------------------------------------------------------------
   CONFIG (const): one entry per feature. Destructured later on.
------------------------------------------------------------------ */
const TOOL_CONFIG = {
    ask: {
        inputId: "askInput",
        outputId: "askOutput",
        buttonId: "askBtn",
        label: "Get Answer",
        promptPrefix: "Answer this question clearly:"
    },
    summarize: {
        inputId: "sumInput",
        outputId: "sumOutput",
        buttonId: "sumBtn",
        label: "Summarize",
        promptPrefix: "Summarize the following text in 3 bullet points:"
    },
    idea: {
        inputId: "ideaInput",
        outputId: "ideaOutput",
        buttonId: "ideaBtn",
        label: "Spark Ideas",
        promptPrefix: "Generate 5 creative ideas for:"
    },
    define: {
        inputId: "defInput",
        outputId: "defOutput",
        buttonId: "defBtn",
        label: "Find Meaning",
        promptPrefix: "Provide a simple definition and one example for the term:"
    }
};

// Shared request settings — merged into every call with the SPREAD operator.
const BASE_REQUEST = {
    generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800
    }
};

/* ------------------------------------------------------------------
   ARROW FUNCTIONS throughout. toggleLoading() adds/removes the CSS
   .loading class and disables the button while a request is in flight.
------------------------------------------------------------------ */
const toggleLoading = (isLoading, outputEl, buttonEl, label) => {
    if (isLoading) {
        outputEl.classList.add("loading");
        outputEl.innerText = `${label}: AI is thinking...`;
        buttonEl.disabled = true;
        buttonEl.innerText = "Working...";
    } else {
        outputEl.classList.remove("loading");
        buttonEl.disabled = false;
        buttonEl.innerText = label;
    }
};

/* ------------------------------------------------------------------
   REST OPERATOR + TEMPLATE LITERALS: buildPrompt(prefix, ...parts)
   accepts any number of extra text chunks and interpolates them.
------------------------------------------------------------------ */
const buildPrompt = (prefix, ...parts) => {
    // SPREAD inside an array literal, then ARRAY METHOD (.filter) to drop empties
    const cleanParts = [...parts].filter((chunk) => chunk && chunk.trim() !== "");

    // ARRAY METHOD (.reduce) + TEMPLATE LITERAL builds the final prompt string
    return cleanParts.reduce((prompt, chunk) => `${prompt}\n\n${chunk}`, `${prefix}`);
};

/* ------------------------------------------------------------------
   ARRAY METHODS: clean the user's raw input before it's sent.
------------------------------------------------------------------ */
const cleanUserInput = (rawText) =>
    rawText
        .split("\n")
        .map((line) => line.trim())      // .map()
        .filter((line) => line !== "")   // .filter()
        .join("\n");

/* ------------------------------------------------------------------
   DESTRUCTURING: pull the answer text out of the nested Gemini response.
------------------------------------------------------------------ */
const extractAIText = (data) => {
    const { candidates } = data;                     // object destructuring

    if (!Array.isArray(candidates) || candidates.length === 0) {
        return "";
    }

    const [{ content }] = candidates;                 // array + object destructuring
    const { parts = [] } = content || {};              // object destructuring w/ default

    return parts
        .map((part) => part.text || "")                // .map()
        .filter((text) => text.trim() !== "")           // .filter()
        .reduce((acc, text) => `${acc}${text}`, "")      // .reduce() + template literal
        .trim();
};

/* ------------------------------------------------------------------
   TEMPLATE LITERAL used to render the finished answer on the page.
------------------------------------------------------------------ */
const renderResult = (outputEl, label, aiText) => {
    const wordCount = aiText.split(/\s+/).filter((word) => word !== "").length;
    outputEl.innerText = `${label} result (${wordCount} words):\n\n${aiText}`;
};

/* ------------------------------------------------------------------
   MAIN HANDLER: fetch() + async/await + try/catch/finally (Promises)
------------------------------------------------------------------ */
async function handleAI(type) {
    const config = TOOL_CONFIG[type];

    if (!config) {
        console.error(`Unknown tool type: ${type}`);
        return;
    }

    // Object destructuring of the config entry
    const { inputId, outputId, buttonId, label, promptPrefix } = config;

    const inputEl = document.getElementById(inputId);
    const outputEl = document.getElementById(outputId);
    const buttonEl = document.getElementById(buttonId);

    if (!inputEl || !outputEl || !buttonEl) {
        console.error(`Could not find elements for: ${type}`);
        return;
    }

    const userInput = cleanUserInput(inputEl.value);

    if (!userInput) {
        alert("Please enter something first!");
        return;
    }

    toggleLoading(true, outputEl, buttonEl, label);

    // SPREAD: merge shared settings with this request's contents
    const requestBody = {
        ...BASE_REQUEST,
        contents: [
            { parts: [{ text: buildPrompt(promptPrefix, userInput) }] }
        ]
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            const { error = {} } = data;   // destructuring the error payload
            throw new Error(error.message || "API error occurred");
        }

        const aiText = extractAIText(data);

        if (aiText) {
            renderResult(outputEl, label, aiText);
        } else {
            outputEl.innerText = `${label} failed: the AI returned an unexpected response format.`;
        }
    } catch (error) {
        console.error("Detailed Error:", error);
        outputEl.innerText = `Error: ${error.message}. Check console for details.`;
    } finally {
        toggleLoading(false, outputEl, buttonEl, label);
    }
}