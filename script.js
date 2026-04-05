import * as Tone from "https://esm.sh/tone";
import * as THREE from "https://esm.sh/three";
import { OrbitControls } from "https://esm.sh/three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "https://esm.sh/three/examples/jsm/loaders/RGBELoader.js";

if (!document.getElementById("mathjax-script")) {
	const mathJaxScript = document.createElement("script");
	mathJaxScript.id = "mathjax-script";
	mathJaxScript.src =
		"https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
	mathJaxScript.async = true;
	document.head.appendChild(mathJaxScript);
	window.MathJax = {
		tex: {
			inlineMath: [
				["$", "$"],
				["\\(", "\\)"]
			],
			displayMath: [
				["$$", "$$"],
				["\\[", "\\]"]
			],
			processEscapes: true
		},
		svg: { fontCache: "global" },
		startup: { typeset: false }
	};
}

if (!document.getElementById("pyodide-script")) {
	const pyodideScript = document.createElement("script");
	pyodideScript.id = "pyodide-script";
	pyodideScript.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
	document.head.appendChild(pyodideScript);
}

if (!document.getElementById("d3-script")) {
	const d3Script = document.createElement("script");
	d3Script.id = "d3-script";
	d3Script.src = "https://cdn.jsdelivr.net/npm/d3@7";
	document.head.appendChild(d3Script);
}

const HIDDEN_KEYS = [
	"WXlrRnFBMUE3Z3R0VlVjbUFDLXNJRHd5OHREWWZnWkFCeVNheklB",
	"UVh0Tk16ZzczNjBPbTVpc0hYcUliRUxlZXo2SExGN1VEeVNheklB",
	"OEtfNHczZ1Zza1JBckFTLUxOaFRsRUh1VVZTUzAySnFEeVNheklB",
	"MDI5MVNReUVGaDhOakxMWUpFSVhTeEJ3cTV0ell3Yy1CeVNheklB",
	"c1dXbmtKc0xCOWN5R1lCdWIwY2pQUDE4cE5nSXBtdDVDeVNheklB",
	"Y1prTmtDVDl4RUFlZkRNLUNIc1pIdzNod3lTRzBycHBDeVNheklB",
	"WXczNDhUTnhVM2d5bkFEX3Z6SHBpVWYteWVTX2UzaTBCeVNheklB",
	"a1R1SVR5Vi04bzVoQXBqaXVZTHVPS3BNektXT0Y0U0tCeVNheklB",
	"d1BNMzhTendweUJUTVRra3lLcWU0dTdyTjE3QlFtUjVDeVNheklB",
	"OFJmclZqUWlWMzZ6aTJPek9SaS1ET3dkc0pkVTAzblFCeVNheklB",
	"RWVkX3FEWFJwU2JqbmgzLTVNLUV4QTNBWWd4T2Vsb2xDeVNheklB",
	"c0Q3WFpMOVRVN05DcElvUjZnRGRSbTlPWlQ0VUx4QTRCeVNheklB",
	"d2ZDalRWTzBET2FvUy1CV21vQlRYMUg3VW0wZFNhTzhEeVNheklB",
	"d19DaUt1a0VPV0M5OWZ2Sm1mUFhZR2FvbGM1a01JZmRBeVNheklB",
	"TVRaMm5zV0FVS21yMHVFanBlT0Y0azVGeDV6V20yV1RBeVNheklB",
	"WWpZXzR3VEdDX25lYkgtWXZnanIyWXJDaEVHOUN1d01CeVNheklB",
	"SWlFVEFkZDhiWVB3bTVTU2ZQamJrZGJKZXZrTnFiX0hCeVNheklB",
	"WTVrZHlYTlA4R2NiWThYcjFKSm5oOUZuYnVxUUo2Z2NBeVNheklB",
	"a3AwbUw3am50SU00aWQ1RXZQZUhIakN5Zjc3dmZhbWlCeVNheklB",
	"SUdoaDkzNHlPRlB1c0U3VkVqcWY5MmlKMXhMNFIzeVJCeVNheklB",
	"Z2gzYUxFdlBhMzFYOFV6U3hpcUxiV2pDWThvTkFUUF9EeVNheklB"
];

let currentKeyIndex = 0;
let pyodideInstance = null;
let pythonRetryCount = 0;
const MAX_PYTHON_RETRIES = 5;
let jsRetryCount = 0;
const MAX_JS_RETRIES = 3;
let emptyResponseRetryCount = 0;
const MAX_EMPTY_RESPONSE_RETRIES = 3;

async function getPyodide() {
	if (pyodideInstance) return pyodideInstance;
	if (typeof loadPyodide === "undefined") {
		await new Promise((resolve) => {
			const check = setInterval(() => {
				if (typeof loadPyodide !== "undefined") {
					clearInterval(check);
					resolve();
				}
			}, 100);
		});
	}
	pyodideInstance = await loadPyodide();
	await pyodideInstance.loadPackage(["numpy", "pandas", "matplotlib"]);
	return pyodideInstance;
}

async function runPythonCode(code, containerId) {
	const container = document.getElementById(containerId);
	if (!container) return;
	container.innerHTML =
		"<p style='color: #FFD43B;'>Initializing Python environment...</p>";
	try {
		const py = await getPyodide();
		let stdout = [];
		py.setStdout({ batched: (msg) => stdout.push(msg) });
		py.setStderr({ batched: (msg) => stdout.push("Error: " + msg) });
		await py.runPythonAsync(code);
		container.innerHTML = `<pre class="python-output" style="background:#111; padding:10px; border-radius:5px; color:#0f0;">${stdout.join(
			"\n"
		)}</pre>`;
	} catch (e) {
		container.innerHTML = `<p style='color: #ff4d4d;'>Python Execution Failed: ${e.message}</p>`;
	}
}

async function executePythonAndCapture(code) {
	try {
		const py = await getPyodide();
		let output = [];
		py.setStdout({ batched: (msg) => output.push(msg) });
		py.setStderr({ batched: (msg) => output.push("Error: " + msg) });
		await py.runPythonAsync(`
import sys
reserved =['__name__', '__doc__', '__package__', 'sys', 'js', 'pyodide', 'numpy', 'pandas', 'matplotlib']
for name in[n for n in globals() if n not in reserved and not n.startswith('_')]:
    del globals()[name]
`);
		await py.runPythonAsync(code);
		return { success: true, output: output.join("\n") };
	} catch (e) {
		return { success: false, output: e.message };
	}
}

function decodeKey(hiddenStr) {
	try {
		return atob(hiddenStr).split("").reverse().join("");
	} catch (e) {
		return "";
	}
}

function getCurrentEndpoint() {
	return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${decodeKey(
		HIDDEN_KEYS[currentKeyIndex]
	)}`;
}

let GEMINI_API_ENDPOINT = getCurrentEndpoint();
const SPOTIFY_CLIENT_ID = "7bdf3020872646a6a5dffd42eb17e774";
const SPOTIFY_CLIENT_SECRET = "ad4a19cdbc3245a9b572e6b313889624";
let spotifyToken = null;
let spotifyTokenExpiry = 0;
let conversationHistory = [];
const POLLINATIONS_AI_IMAGE_API_ENDPOINT = `https://image.pollinations.ai/prompt/`;
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const historyBtn = document.getElementById("history-btn");
const clearHistoryBtn = document.getElementById("clear-history-btn");
const historyPanel = document.getElementById("history-panel");
const chatList = document.getElementById("chat-list");
const closeHistoryBtn = document.getElementById("close-history-btn");
const fileInput = document.getElementById("file-input");
const selectedFilesDisplay = document.getElementById("selected-files-display");
let selectedFiles = [];
const CHATS_STORAGE_KEY = "gemini_chat_history";
const MEMORY_STORAGE_KEY = "beweble_persistent_memory";
let currentChatId = null;
let currentAbortController = null;
const MAX_INPUT_HEIGHT = 200;
let isWaitingForToolExecution = false;
let isProcessing = false;
let currentStatusMessageElement = null;
let lastUserMessageText = "";
let isStudyMode = false;

let studySeconds = 0;
let studyInterval = null;
let isStudyPaused = false;
let hasSuggestedBreak = false;

const SAMPLE_RATE = 44100;
const SEND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-send" viewBox="0 0 16 16"><path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576zm6.787-8.201L1.591 6.602l4.339 2.76z"></path></svg>`;
const STOP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>`;

const style = document.createElement("style");
style.textContent = `
    .message-actions { display: flex; gap: 5px; margin-top: 5px; opacity: 0.7; font-size: 0.8em; }
    .message:hover .message-actions { opacity: 1; }
    .edit-msg-btn, .copy-code-btn, .download-btn, .rewrite-btn { background: var(--input-bg); border: 1px solid var(--border-color); color: var(--neutral-medium); border-radius: 4px; padding: 2px 8px; cursor: pointer; font-size: 0.8rem; }
    .edit-msg-btn:hover, .copy-code-btn:hover { background: var(--bubble-user); color: var(--text-dark); }
    .message.user .message-actions { justify-content: flex-end; }
    #user-input { white-space: pre-wrap; overflow-wrap: break-word; }
    #user-input * { font-family: inherit !important; font-size: inherit !important; color: inherit !important; background: transparent !important; font-weight: normal !important; font-style: normal !important; text-decoration: none !important; }
    .spotify-container { margin-top: 10px; border-radius: 12px; overflow: hidden; background: #000; min-height: 80px; width: 100%; box-shadow: 0 4px 12px var(--shadow); }
    .maps-route-container { margin-top: 20px; background: var(--bg-dark); border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px var(--shadow); font-family: var(--font-main); }
    .maps-route-header { background: linear-gradient(90deg, var(--bubble-bot) 0%, var(--input-bg) 100%); padding: 18px 20px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; }
    .maps-header-title { display: flex; align-items: center; gap: 12px; font-size: 1.1rem; font-weight: 600; color: var(--text-dark); }
    .maps-header-icon { color: var(--mic-btn-color); background: rgba(16, 185, 129, 0.1); padding: 8px; border-radius: 50%; }
    .maps-header-mode { font-size: 0.85rem; color: var(--neutral-medium); background: var(--input-bg); padding: 4px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
    .maps-timeline { padding: 25px 25px 10px 35px; background: var(--bg-dark); position: relative; }
    .maps-step { position: relative; padding-bottom: 30px; padding-left: 25px; border-left: 2px solid var(--border-color); }
    .maps-step:last-child { border-left: 2px solid transparent; padding-bottom: 0; }
    .maps-step::before { content: ''; position: absolute; left: -7px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: var(--bg-dark); border: 2px solid var(--neutral-medium); z-index: 2; transition: all 0.3s ease; }
    .maps-step.start::before { border-color: var(--mic-btn-color); background: var(--mic-btn-color); box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2); }
    .maps-step.waypoint::before { border-color: var(--primary-color); background: var(--primary-color); }
    .maps-step.end::before { border-color: var(--btn-danger); background: var(--btn-danger); box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2); }
    .maps-step-content { display: flex; flex-direction: column; gap: 4px; position: relative; top: -2px; }
    .maps-location { font-size: 1rem; color: var(--text-dark); font-weight: 500; line-height: 1.2; }
    .maps-label { font-size: 0.75rem; color: var(--neutral-medium); text-transform: uppercase; letter-spacing: 0.5px; }
    .maps-actions { padding: 15px; background: var(--input-bg); border-top: 1px solid var(--border-color); display: flex; gap: 10px; }
    .maps-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.95rem; transition: transform 0.2s, filter 0.2s; }
    .maps-btn-primary { background: var(--primary-color); color: white; box-shadow: 0 4px 6px rgba(96, 165, 250, 0.3); }
    .maps-btn-primary:hover { background: var(--btn-primary-hover); transform: translateY(-1px); }
    .maps-embed-frame { width: 100%; height: 300px; border: none; border-top: 1px solid var(--border-color); filter: grayscale(20%) contrast(90%); transition: filter 0.3s; }
    .maps-embed-frame:hover { filter: grayscale(0%) contrast(100%); }
    .weather-card { background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%); color: white; padding: 20px; border-radius: 16px; margin-top: 10px; box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37); font-family: var(--font-main); position: relative; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.18); }
    .weather-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .weather-loc { font-size: 1.4em; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .weather-main { display: flex; align-items: center; gap: 15px; }
    .weather-temp { font-size: 3.5em; font-weight: 800; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .weather-cond { font-size: 1.1em; opacity: 0.9; text-transform: capitalize; }
    .weather-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 20px; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; backdrop-filter: blur(4px); }
    .weather-item { text-align: center; }
    .weather-item span { display: block; font-size: 0.75em; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .weather-item strong { display: block; font-size: 1.1em; font-weight: 600; }
    .weather-summary { margin-top: 15px; font-size: 0.9em; opacity: 0.9; font-style: italic; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px; }
    .news-container { margin-top: 15px; display: flex; flex-direction: column; gap: 12px; }
    .news-card { background: var(--input-bg); padding: 16px; border-radius: 12px; border-left: 4px solid var(--primary-color); box-shadow: 0 4px 6px var(--shadow); transition: transform 0.2s, background 0.2s; text-decoration: none; display: block; }
    .news-card:hover { transform: translateX(4px); background: var(--bubble-bot); }
    .news-title { display: block; font-size: 1.05em; font-weight: 600; color: var(--text-dark); margin-bottom: 8px; line-height: 1.4; }
    .news-meta { display: flex; justify-content: space-between; align-items: center; font-size: 0.8em; color: var(--neutral-medium); }
    .news-source { color: var(--primary-color); font-weight: 500; }
    .news-time { opacity: 0.7; }
    .geometry-container { width: 100%; min-height: 350px; background: var(--input-bg); border: 1px solid var(--border-color); border-radius: 8px; margin: 10px 0; overflow: hidden; position: relative; }
    .geometry-container svg { display: block; margin: auto; }
    #send-btn.stop-mode { background-color: var(--btn-danger) !important; color: white !important; border-color: var(--btn-danger) !important; }
    #send-btn.stop-mode:hover { background-color: var(--btn-danger-hover) !important; }
    
    body.study-mode .header, 
    body.study-mode #history-btn, 
    body.study-mode #new-chat-btn,
    body.study-mode #file-input-label,
    body.study-mode .message-actions,
    body.study-mode .cross-questions,
    body.study-mode #memory-btn {
        display: none !important;
    }
    body.study-mode #chat-box {
        height: calc(100vh - 120px);
        max-width: 1200px;
    }
    body.study-mode .message {
        margin: 10px 0;
        font-size: 1.1em;
        line-height: 1.6;
        max-width: 85%;
    }
    .study-form {
        background: var(--input-bg);
        padding: 20px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        margin-top: 10px;
    }
    .study-form-item {
        margin-bottom: 15px;
    }
    .study-form-label {
        display: block;
        margin-bottom: 5px;
        color: var(--neutral-medium);
        font-size: 0.9em;
    }
    .study-form-input {
        width: 100%;
        padding: 10px;
        background: var(--bubble-user);
        border: 1px solid var(--border-color);
        color: var(--text-dark);
        border-radius: 5px;
        font-family: inherit;
    }
    .study-form-input:focus {
        border-color: var(--primary-color);
        outline: none;
    }
    .study-submit-btn {
        background: var(--primary-color);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        transition: background 0.2s;
    }
    .study-submit-btn:hover {
        background: var(--btn-primary-hover);
    }
    .loading-sequence-text {
        color: var(--mic-btn-color);
        font-family: var(--font-code);
        font-weight: bold;
    }
    #memory-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 100%;
        height: 100%;
        background-color: var(--history-bg);
        backdrop-filter: blur(20px);
        z-index: 20;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 24px;
        box-sizing: border-box;
        color: var(--text-dark);
        overflow-y: auto;
        transform: translateX(100%);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: transform 0.4s ease-in-out, opacity 0.4s ease-in-out, visibility 0.4s ease-in-out;
    }
    #memory-panel.visible {
        transform: translateX(0);
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
    }
    #memory-list {
        list-style: none;
        flex-grow: 1;
        padding: 0;
        margin: 0;
        max-height: 70vh;
        overflow-y: auto;
        width: 90%;
        max-width: 500px;
        background-color: var(--input-bg);
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 15px var(--shadow);
    }
    .memory-item {
        background-color: var(--bubble-bot);
        margin-bottom: 12px;
        padding: 15px 20px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        position: relative;
        transition: background-color 0.2s ease;
    }
    .memory-item:hover {
        background-color: #1a1a3a;
    }
    .memory-content {
        color: var(--text-dark);
        font-size: 0.95rem;
        margin-bottom: 8px;
        line-height: 1.4;
    }
    .memory-meta {
        font-size: 0.75rem;
        color: var(--neutral-medium);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .delete-memory-btn {
        background: transparent;
        border: none;
        color: var(--btn-danger);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background 0.2s, transform 0.2s;
    }
    .delete-memory-btn:hover {
        background: rgba(239, 68, 68, 0.1);
        transform: scale(1.1);
    }
    #close-memory-btn {
        margin-top: 25px;
        padding: 12px 30px;
        border: none;
        border-radius: 50px;
        cursor: pointer;
        background-color: var(--btn-primary);
        color: white;
        font-size: 1em;
        transition: background-color 0.2s ease, transform 0.1s ease;
        box-shadow: 0 4px 12px var(--shadow);
    }
    #close-memory-btn:hover {
        background-color: var(--btn-primary-hover);
        transform: translateY(-2px);
    }
    .memory-header {
        width: 90%;
        max-width: 500px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
				flex-direction: column;
    }
    .memory-header h3 {
        margin: 0;
        color: var(--primary-color);
        font-size: 1.5rem;
    }
    .memory-input-container {
        display: flex; gap: 8px; width: 90%; max-width: 500px; margin-bottom: 20px;
    }
    #manual-memory-input {
        flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);
        background: var(--bubble-user); color: var(--text-dark); outline: none;
    }
    #add-memory-btn {
        padding: 10px 20px; border-radius: 8px; border: none; background: var(--primary-color);
        color: white; cursor: pointer; font-weight: bold; transition: background 0.2s;
    }
    #add-memory-btn:hover { background: var(--btn-primary-hover); }
    #memory-btn {
        margin-left: 2px;
    }
    .youtube-embed-container {
        position: relative;
        padding-bottom: 56.25%;
        height: 0;
        overflow: hidden;
        max-width: 100%;
        border-radius: 8px;
        margin-top: 10px;
        background: #000;
        box-shadow: 0 4px 12px var(--shadow);
    }
    .youtube-embed-container iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 0;
    }
    .gif-container img, .real-image-container img, .screenshot-container img {
        max-width: 100%;
        border-radius: 8px;
        margin-top: 10px;
        box-shadow: 0 4px 12px var(--shadow);
    }
    .screenshot-container {
        border: 1px solid var(--border-color);
        overflow: hidden;
        border-radius: 8px;
        background: #000;
    }
    .mcq-container { background: var(--bg-dark); padding: 15px; border-radius: 10px; margin: 10px 0; border: 1px solid var(--border-color); }
    .mcq-question { font-weight: bold; margin-bottom: 10px; }
    .mcq-option { display: block; width: 100%; text-align: left; background: var(--input-bg); border: 1px solid var(--border-color); padding: 10px; margin-bottom: 5px; border-radius: 5px; cursor: pointer; transition: 0.2s; color: var(--text-dark); }
    .mcq-option:hover { background: var(--bubble-user); }
    .mcq-option.correct { background: rgba(16, 185, 129, 0.2); border-color: var(--mic-btn-color); }
    .mcq-option.wrong { background: rgba(239, 68, 68, 0.2); border-color: var(--btn-danger); }
    
    #study-timer-container {
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-dark);
        border: 2px solid var(--primary-color);
        color: var(--primary-color);
        padding: 10px 20px;
        border-radius: 30px;
        font-family: var(--font-code);
        font-size: 1.2rem;
        z-index: 10000;
        display: none;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 15px var(--shadow);
        transition: all 0.3s ease;
    }
    #study-timer-container.paused {
        border-color: var(--neutral-medium);
        color: var(--neutral-medium);
    }
    .timer-btn {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .timer-btn:hover {
        transform: scale(1.1);
    }
    .run-python-btn {
        background: var(--primary-color);
        color: white; border: none; padding: 5px 12px; border-radius: 4px;
        cursor: pointer; margin-top: 5px; font-size: 0.8rem; font-weight: bold; transition: 0.2s;
    }
    .run-python-btn:hover { background: var(--btn-primary-hover); }
`;
document.head.appendChild(style);

function formatStudyTime(sec) {
	const h = Math.floor(sec / 3600);
	const m = Math.floor((sec % 3600) / 60);
	const s = sec % 60;
	if (h > 0)
		return `${h.toString().padStart(2, "0")}:${m
			.toString()
			.padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function updateTimerUI() {
	const el = document.getElementById("study-timer-text");
	if (el) el.innerText = formatStudyTime(studySeconds);
}

function saveStudyState() {
	if (!currentChatId) return;
	const state = { elapsed: studySeconds, paused: isStudyPaused };
	localStorage.setItem("study_state_" + currentChatId, JSON.stringify(state));
}

function loadStudyState() {
	if (!currentChatId) return null;
	const saved = localStorage.getItem("study_state_" + currentChatId);
	return saved ? JSON.parse(saved) : null;
}

function triggerBreakSuggestion() {
	const msg = `SYSTEM: The user has been studying continuously for 90 minutes. Suggest taking a 10-15 minute break and stretch.`;
	conversationHistory.push({ role: "user", parts: [{ text: msg }] });
	continueChatWithContext();
}

function toggleStudyPause() {
	isStudyPaused = !isStudyPaused;
	const container = document.getElementById("study-timer-container");
	const btn = document.getElementById("study-timer-pause-btn");
	if (isStudyPaused) {
		clearInterval(studyInterval);
		container.classList.add("paused");
		if (btn) btn.innerText = "▶";
		saveStudyState();
		addMessage(
			"Study Mode paused. Type to resume or use the play button.",
			"bot",
			new Date()
		);
	} else {
		container.classList.remove("paused");
		if (btn) btn.innerText = "⏸";
		startStudyTimer(studySeconds);
		addMessage("Study Mode resumed.", "bot", new Date());
		if (
			document.documentElement.requestFullscreen &&
			!document.fullscreenElement
		) {
			document.documentElement.requestFullscreen().catch(() => {});
		}
	}
}

function startStudyTimer(resumeSeconds = 0) {
	studySeconds = resumeSeconds;
	hasSuggestedBreak = studySeconds >= 5400;

	let timerUI = document.getElementById("study-timer-container");
	if (!timerUI) {
		timerUI = document.createElement("div");
		timerUI.id = "study-timer-container";
		timerUI.innerHTML = `<span id="study-timer-text">00:00</span> <button id="study-timer-pause-btn" class="timer-btn" title="Pause/Resume Study">⏸</button>`;
		document.body.appendChild(timerUI);
		document
			.getElementById("study-timer-pause-btn")
			.addEventListener("click", toggleStudyPause);
	}

	timerUI.style.display = "flex";
	updateTimerUI();

	clearInterval(studyInterval);
	if (!isStudyPaused) {
		studyInterval = setInterval(() => {
			studySeconds++;
			saveStudyState();
			updateTimerUI();

			if (studySeconds === 5400 && !hasSuggestedBreak) {
				hasSuggestedBreak = true;
				triggerBreakSuggestion();
			}
		}, 1000);
	}
}

function stopStudyTimer() {
	clearInterval(studyInterval);
	const timerUI = document.getElementById("study-timer-container");
	if (timerUI) timerUI.style.display = "none";
	if (currentChatId) localStorage.removeItem("study_state_" + currentChatId);
	studySeconds = 0;
}

function showStudyResumeModal() {
	const overlay = document.createElement("div");
	overlay.id = "study-resume-overlay";
	overlay.style.cssText =
		"position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);";
	overlay.innerHTML = `
        <div style="background:var(--bg-dark);padding:35px;border-radius:16px;text-align:center;border:2px solid var(--primary-color);box-shadow:0 10px 40px rgba(0,0,0,0.5);max-width:450px;font-family:var(--font-main);">
            <h2 style="color:var(--text-dark);margin-top:0;font-size:1.8rem;">Study Mode is Active</h2>
            <p style="color:var(--neutral-medium);line-height:1.5;margin-bottom:25px;">You have an ongoing study session in this chat. Would you like to continue from where you left off or end it?</p>
            <div style="display:flex;gap:15px;justify-content:center;">
                <button id="study-resume-btn" style="flex:1;padding:12px;background:var(--primary-color);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:1rem;transition:transform 0.2s;">Continue</button>
                <button id="study-end-btn" style="flex:1;padding:12px;background:transparent;color:var(--btn-danger);border:2px solid var(--btn-danger);border-radius:8px;cursor:pointer;font-weight:bold;font-size:1rem;transition:background 0.2s;">End Session</button>
            </div>
        </div>
    `;
	document.body.appendChild(overlay);

	document.getElementById("study-resume-btn").addEventListener("click", () => {
		document.body.removeChild(overlay);
		toggleStudyMode(true);
		if (
			document.documentElement.requestFullscreen &&
			!document.fullscreenElement
		) {
			document.documentElement.requestFullscreen().catch(() => {});
		}
		addMessage("Study session resumed.", "bot", new Date());
	});

	document.getElementById("study-end-btn").addEventListener("click", () => {
		document.body.removeChild(overlay);
		exitStudyMode(true);
	});
}

function showFullscreenExitModal() {
	if (document.getElementById("study-exit-overlay")) return;

	if (!isStudyPaused) {
		clearInterval(studyInterval);
	}

	const overlay = document.createElement("div");
	overlay.id = "study-exit-overlay";
	overlay.style.cssText =
		"position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);";
	overlay.innerHTML = `
        <div style="background:var(--bg-dark);padding:35px;border-radius:16px;text-align:center;border:2px solid var(--primary-color);box-shadow:0 10px 40px rgba(0,0,0,0.5);max-width:450px;font-family:var(--font-main);">
            <h2 style="color:var(--text-dark);margin-top:0;font-size:1.8rem;">You Exited Fullscreen</h2>
            <p style="color:var(--neutral-medium);line-height:1.5;margin-bottom:25px;">Study Mode works best without distractions. Would you like to continue studying or end the session?</p>
            <div style="display:flex;gap:15px;justify-content:center;">
                <button id="modal-continue-study-btn" style="flex:1;padding:12px;background:var(--primary-color);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:1rem;transition:transform 0.2s;">Continue</button>
                <button id="modal-end-study-btn" style="flex:1;padding:12px;background:transparent;color:var(--btn-danger);border:2px solid var(--btn-danger);border-radius:8px;cursor:pointer;font-weight:bold;font-size:1rem;transition:background 0.2s;">End Session</button>
            </div>
        </div>
    `;
	document.body.appendChild(overlay);

	document
		.getElementById("modal-continue-study-btn")
		.addEventListener("click", () => {
			document.body.removeChild(overlay);
			if (!isStudyPaused) {
				startStudyTimer(studySeconds);
			}
			if (
				document.documentElement.requestFullscreen &&
				!document.fullscreenElement
			) {
				document.documentElement.requestFullscreen().catch(() => {});
			}
		});

	document
		.getElementById("modal-end-study-btn")
		.addEventListener("click", () => {
			document.body.removeChild(overlay);
			exitStudyMode(true);
		});
}

document.addEventListener("fullscreenchange", () => {
	if (!document.fullscreenElement && isStudyMode && !isStudyPaused) {
		showFullscreenExitModal();
	}
});

window.addEventListener("beforeunload", (e) => {
	if (isStudyMode) {
		const msg =
			"You have an active Study Mode session. Are you sure you want to leave?";
		e.preventDefault();
		e.returnValue = msg;
		return msg;
	}
});

function createMemoryUI() {
	const memoryBtn = document.createElement("button");
	memoryBtn.id = "memory-btn";
	memoryBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/><path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.734 1.734 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.734 1.734 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.734 1.734 0 0 0 1.097-1.097l.387-1.162zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L13.863.1z"/></svg>`;
	memoryBtn.title = "Persistent Memory";
	if (historyBtn && historyBtn.parentNode) {
		historyBtn.parentNode.insertBefore(memoryBtn, historyBtn.nextSibling);
	}

	const memoryPanel = document.createElement("div");
	memoryPanel.id = "memory-panel";
	memoryPanel.innerHTML = `
        <div class="memory-header">
            <h3>Memory</h3>
        </div>
        <div class="memory-input-container">
            <input type="text" id="manual-memory-input" placeholder="Add custom memory manually...">
            <button id="add-memory-btn">Add</button>
        </div>
        <ul id="memory-list"></ul>
        <button id="close-memory-btn">Close Memory</button>
    `;
	document.body.appendChild(memoryPanel);

	memoryBtn.addEventListener("click", () => {
		loadMemoryPanel();
		memoryPanel.classList.add("visible");
	});

	document.getElementById("close-memory-btn").addEventListener("click", () => {
		memoryPanel.classList.remove("visible");
	});

	document.getElementById("add-memory-btn").addEventListener("click", () => {
		const input = document.getElementById("manual-memory-input");
		const val = input.value.trim();
		if (val) {
			saveMemory(val);
			input.value = "";
		}
	});
}
createMemoryUI();

function getMemory() {
	return JSON.parse(localStorage.getItem(MEMORY_STORAGE_KEY) || "[]");
}

function saveMemory(content) {
	const memory = getMemory();
	const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
	memory.push({
		id: newId,
		content: content,
		timestamp: new Date().toISOString()
	});
	localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memory));
	loadMemoryPanel();
	return newId;
}

function deleteMemory(id) {
	let memory = getMemory();
	memory = memory.filter((m) => m.id !== id);
	localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memory));
	loadMemoryPanel();
}

function deleteMemoryByContent(content) {
	let memory = getMemory();
	memory = memory.filter((m) => m.content.trim() !== content.trim());
	localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memory));
	loadMemoryPanel();
}

function clearMemory() {
	localStorage.removeItem(MEMORY_STORAGE_KEY);
	loadMemoryPanel();
}

function loadMemoryPanel() {
	const list = document.getElementById("memory-list");
	if (!list) return;
	const memory = getMemory();
	list.innerHTML = "";
	if (memory.length === 0) {
		list.innerHTML =
			"<li style='color:#777; padding:10px; text-align:center;'>No memories saved.</li>";
		return;
	}
	memory.forEach((item) => {
		const li = document.createElement("li");
		li.className = "memory-item";
		li.innerHTML = `
            <div class="memory-content">${escapeHTML(item.content)}</div>
            <div class="memory-meta">
                <span>${new Date(item.timestamp).toLocaleDateString()}</span>
                <button class="delete-memory-btn" data-id="${
																	item.id
																}" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                </button>
            </div>
        `;
		li.querySelector(".delete-memory-btn").addEventListener("click", () => {
			deleteMemory(item.id);
		});
		list.appendChild(li);
	});
}

function updateButtonState(state) {
	if (state === "send") {
		sendBtn.innerHTML = SEND_SVG;
		sendBtn.classList.remove("stop-mode");
		sendBtn.disabled = false;
		sendBtn.title = "Send message";
	} else if (state === "stop") {
		sendBtn.innerHTML = STOP_SVG;
		sendBtn.classList.add("stop-mode");
		sendBtn.disabled = false;
		sendBtn.title = "Stop generating";
	} else if (state === "disabled") {
		sendBtn.disabled = true;
	}
}

updateButtonState("send");

class PerlinNoise {
	constructor(seed = 1) {
		this.p = new Array(512);
		this.permutation = new Array(256);
		for (let i = 0; i < 256; i++) {
			seed = (seed * 9301 + 49297) % 233280;
			this.permutation[i] = Math.floor((seed / 233280.0) * 256);
		}
		for (let i = 0; i < 512; i++) {
			this.p[i] = this.permutation[i % 256];
		}
	}
	fade(t) {
		return t * t * t * (t * (t * 6 - 15) + 10);
	}
	grad(hash, x) {
		hash = hash & 15;
		const grad = 1 + (hash & 7);
		if (hash & 8) return -grad * x;
		return grad * x;
	}
	noise(x) {
		let X = Math.floor(x) & 255;
		x -= Math.floor(x);
		let u = this.fade(x);
		let A = this.p[X],
			B = this.p[X + 1];
		let hA = A & 15;
		let hB = B & 15;
		let gA = this.grad(hA, x);
		let gB = this.grad(hB, x - 1);
		return (1 - u) * gA + u * gB;
	}
}
const noiseGenerator = new PerlinNoise(42);

function writeString(view, offset, string) {
	for (let i = 0; i < string.length; i++) {
		view.setUint8(offset + i, string.charCodeAt(i));
	}
}

function writeInt(view, offset, i) {
	view.setUint32(offset, i, true);
}

function writeShort(view, offset, i) {
	view.setUint16(offset, i, true);
}

function bufferToWave(audioBuffer) {
	const numChannels = audioBuffer.numberOfChannels;
	const length = audioBuffer.length * numChannels * 2 + 44;
	const buffer = new ArrayBuffer(length);
	const view = new DataView(buffer);
	const data = [];
	for (let channel = 0; channel < numChannels; channel++) {
		data.push(audioBuffer.getChannelData(channel));
	}
	let offset = 0;
	const sampleRate = audioBuffer.sampleRate;
	const bitsPerSample = 16;
	const blockAlign = (bitsPerSample / 8) * numChannels;
	const byteRate = sampleRate * blockAlign;
	writeString(view, offset, "RIFF");
	offset += 4;
	writeInt(view, offset, length - 8);
	offset += 4;
	writeString(view, offset, "WAVE");
	offset += 4;
	writeString(view, offset, "fmt ");
	offset += 4;
	writeInt(view, offset, 16);
	offset += 4;
	writeShort(view, offset, 1);
	offset += 2;
	writeShort(view, offset, numChannels);
	offset += 2;
	writeInt(view, offset, sampleRate);
	offset += 4;
	writeInt(view, offset, byteRate);
	offset += 4;
	writeShort(view, offset, blockAlign);
	offset += 2;
	writeShort(view, offset, bitsPerSample);
	offset += 2;
	writeString(view, offset, "data");
	offset += 4;
	writeInt(view, offset, audioBuffer.length * numChannels * 2);
	offset += 4;
	for (let i = 0; i < audioBuffer.length; i++) {
		for (let channel = 0; channel < numChannels; channel++) {
			let sample = data[channel][i];
			let intSample = Math.max(-1, Math.min(1, sample)) * 32767;
			view.setInt16(offset, intSample, true);
			offset += 2;
		}
	}
	return new Blob([view], {
		type: "audio/wav"
	});
}

function calculateDurationFromMusicData(musicData) {
	const tempo = musicData.tempo || 120;
	const measureDurationSeconds = (60 / tempo) * 4;
	let totalDurationSeconds = 0;
	const phrases = {};
	if (musicData.phrases_list) {
		musicData.phrases_list.forEach((phrase) => {
			phrases[phrase.phrase_name] = phrase;
		});
	}
	musicData.structure.forEach((phraseName) => {
		const phraseConfig = phrases[phraseName];
		if (phraseConfig) {
			const phraseDurationMeasures = phraseConfig.duration_measures || 4;
			totalDurationSeconds += measureDurationSeconds * phraseDurationMeasures;
		}
	});
	return totalDurationSeconds;
}

function getPhraseDetails(musicData) {
	const phrases = {};
	if (musicData.phrases_list) {
		musicData.phrases_list.forEach((phrase) => {
			phrases[phrase.phrase_name] = phrase;
		});
	}
	const tempo = musicData.tempo || 120;
	const measureDurationSeconds = (60 / tempo) * 4;
	return {
		phrases,
		measureDurationSeconds
	};
}

function schedulePhraseContent(musicData, phraseConfig, phraseIndex, context) {
	Tone.setContext(context);
	const transport = context.transport;
	transport.bpm.value = musicData.tempo || 120;
	transport.loop = false;
	transport.clear();
	const instruments = {};
	const measureDurationSeconds = (60 / musicData.tempo) * 4;
	const phraseDurationMeasures = phraseConfig.duration_measures || 4;
	const phraseDurationSeconds = measureDurationSeconds * phraseDurationMeasures;

	const eq = new Tone.EQ3(3, 1, 2).toDestination();
	const compressor = new Tone.Compressor(-20, 4).connect(eq);
	const reverb = new Tone.Reverb({
		decay: musicData.master_reverb_decay || 2.5,
		wet: 0.3
	}).connect(compressor);
	const delay = new Tone.FeedbackDelay({
		delayTime: "8n",
		feedback: 0.2,
		wet: 0.2
	}).connect(reverb);
	const masterGain = new Tone.Gain(0.9).connect(delay);

	musicData.instruments.forEach((instConfig) => {
		let instrument;
		const InstrumentConstructor = Tone[instConfig.type];
		const options = instConfig.options || {};
		try {
			if (InstrumentConstructor) {
				if (
					["Synth", "AMSynth", "FMSynth", "MembraneSynth"].includes(instConfig.type)
				) {
					instrument = new Tone.PolySynth(InstrumentConstructor, options);
				} else if (
					["NoiseSynth", "MetalSynth", "PluckSynth"].includes(instConfig.type)
				) {
					instrument = new InstrumentConstructor(options);
				} else if (instConfig.type === "Sampler") {
					instrument = new Tone.PolySynth(Tone.Synth, options);
				} else {
					instrument = new Tone.PolySynth(Tone.Synth, options);
				}
			}
		} catch (e) {
			instrument = null;
		}
		if (!instrument) return;
		const pitchDriftLFO = new Tone.LFO({
			frequency: Math.random() * 0.5 + 0.1,
			amplitude: Math.random() * 0.005 + 0.005
		}).start();
		if (instrument.detune) {
			pitchDriftLFO.connect(instrument.detune);
		}
		const filter = new Tone.Filter({
			type: "lowpass",
			frequency: 8000,
			rolloff: -12
		}).connect(masterGain);
		instrument.connect(filter);
		let lfoFreq = 0.5,
			lfoDepth = 3000;
		if (instConfig.name.toLowerCase().includes("bass")) {
			lfoFreq = 0.2;
			lfoDepth = 1500;
		} else if (instConfig.name.toLowerCase().includes("lead")) {
			lfoFreq = 2.0;
			lfoDepth = 5000;
		}
		const filterLFO = new Tone.LFO({
			type: "sine",
			frequency: lfoFreq,
			amplitude: 1
		}).start();
		filterLFO.min = filter.frequency.value - lfoDepth;
		filterLFO.max = filter.frequency.value + lfoDepth;
		filterLFO.connect(filter.frequency);
		instruments[instConfig.name] = {
			instrument,
			pitchDriftLFO,
			filter,
			filterLFO,
			type: instConfig.type
		};
	});
	let currentTime = 0;
	const patternStartMeasure = phraseIndex * phraseDurationMeasures;
	phraseConfig.patterns.forEach((pattern, patternIndex) => {
		const instrumentPair = instruments[pattern.instrument_name];
		if (!instrumentPair) return;
		const { instrument, type } = instrumentPair;
		if (!Array.isArray(pattern.sequence) || pattern.sequence.length === 0) return;
		const noiseDepth = pattern.noise_modulation_depth || 0.1;
		const noiseSpeed = 0.05 + patternStartMeasure * 0.01 + patternIndex * 0.01;
		const stepsPerLoop = pattern.sequence.length;
		const subdivision = pattern.subdivision || "8n";
		const patternLoopDuration = Tone.Time(subdivision).toSeconds() * stepsPerLoop;
		const numLoops = Math.ceil(phraseDurationSeconds / patternLoopDuration);
		const maxJitterSeconds = Tone.Time(subdivision).toSeconds() * 0.1;
		for (let loop = 0; loop < numLoops; loop++) {
			const loopStartTime = loop * patternLoopDuration;
			if (loopStartTime < phraseDurationSeconds) {
				pattern.sequence.forEach((note, noteIndex) => {
					if (note === null || note === "rest" || note === "null") return;
					const baseNoteTime =
						loopStartTime + noteIndex * Tone.Time(subdivision).toSeconds();
					if (baseNoteTime >= phraseDurationSeconds) return;
					const jitter = (Math.random() - 0.5) * maxJitterSeconds;
					const noteTime = baseNoteTime + jitter;
					transport.schedule((time) => {
						const noiseValue = noiseGenerator.noise(time * noiseSpeed);
						let velocity = 0.8 + noiseValue * noiseDepth;
						velocity = Math.min(1.0, Math.max(0.2, velocity));
						try {
							if (type === "NoiseSynth" || type === "MetalSynth") {
								instrument.triggerAttackRelease(
									pattern.note_duration || subdivision,
									time,
									velocity
								);
							} else {
								instrument.triggerAttackRelease(
									note,
									pattern.note_duration || subdivision,
									time,
									velocity
								);
							}
						} catch (err) {}
					}, noteTime);
				});
			}
		}
	});
	transport.stop(phraseDurationSeconds);
	transport.start(0);
	return masterGain;
}

async function renderPhraseByPhrase(musicData, totalDuration, updateCallback) {
	const { phrases, measureDurationSeconds } = getPhraseDetails(musicData);
	const allBuffers = [];
	let cumulativeDurationSeconds = 0;
	const FADE_TIME = 3.0;
	for (let i = 0; i < musicData.structure.length; i++) {
		const phraseName = musicData.structure[i];
		const phraseConfig = phrases[phraseName];
		if (!phraseConfig) continue;
		const phraseDurationMeasures = phraseConfig.duration_measures || 4;
		const phraseDurationSeconds = measureDurationSeconds * phraseDurationMeasures;
		if (cumulativeDurationSeconds >= totalDuration) break;
		const renderDuration = Math.min(
			phraseDurationSeconds,
			totalDuration - cumulativeDurationSeconds
		);
		if (renderDuration <= 0) break;
		updateCallback(
			`Rendering Phrase ${i + 1}/${
				musicData.structure.length
			}: **${phraseName}**...`
		);
		const phraseContext = new Tone.OfflineContext(2, renderDuration, SAMPLE_RATE);
		const masterGain = schedulePhraseContent(
			musicData,
			phraseConfig,
			i,
			phraseContext
		);
		if (
			i === musicData.structure.length - 1 ||
			cumulativeDurationSeconds + renderDuration >= totalDuration - FADE_TIME
		) {
			const fadeStart = renderDuration - FADE_TIME;
			if (fadeStart > 0) {
				masterGain.gain.exponentialRampTo(0.0001, FADE_TIME, fadeStart);
			}
		}
		const phraseBuffer = await phraseContext.render();
		allBuffers.push(phraseBuffer);
		cumulativeDurationSeconds += renderDuration;
	}
	const actualTotalSamples = Math.floor(cumulativeDurationSeconds * SAMPLE_RATE);
	const finalBuffer = Tone.context.createBuffer(
		2,
		actualTotalSamples,
		SAMPLE_RATE
	);
	let offset = 0;
	allBuffers.forEach((buffer) => {
		const samplesToCopy = buffer.length;
		finalBuffer.copyToChannel(buffer.getChannelData(0), 0, offset);
		finalBuffer.copyToChannel(buffer.getChannelData(1), 1, offset);
		offset += samplesToCopy;
	});
	return finalBuffer;
}

async function getMusicJson(prompt) {
	let systemPrompt = `
        You are a **masterful, creative, and thematic AI Music Composer** and Orchestrator.
        Your task is to analyze the user's request and generate a single, complete, executable JSON configuration for a structured song that can be rendered by Tone.js.
        
        **PRIMARY GOAL: Thematically Cohesive and High-Quality Music.**
        1. **Analyze the Prompt Deeply:** Select instruments, sounds, keys, tempos, and musical complexity that are **cool, modern, suitable**, and directly reflect the **specific theme, mood, or genre** requested in the user's prompt (e.g., "Cyberpunk", "Chill Lo-Fi", "Epic Orchestral").
        2. **Advanced Voice Leading & Voicing:** Ensure smooth, professional voice leading in all harmonic parts by prioritizing **stepwise motion** and **common-tone retention** between chords. Use **chord inversions** (different note orders) to minimize the distance each individual voice/note moves between chords.
        3. **Rhythmic Sophistication (Anti-Quantization):** Avoid monotonous, robotically quantized rhythms. Introduce rhythmic variation by occasionally using dotted notes, syncopation, triplets, or sequences of mixed subdivisions (\`8n\`, \`16n\`) to create groove and feel.
        4. **Thematic Development & Motifs:** The music must evolve. When a pattern repeats in a later phrase, apply **thematic variation** through slight changes in rhythm, interval, transposition, or timbre.
        5. **Dynamic and Timbral Evolution:** Control the overall texture. Phrases should build or reduce intensity by strategically adding or removing instrumental layers.
        6. **SFX and Realism:** Use 'NoiseSynth', 'MetalSynth', or 'PluckSynth' to create intense, realistic sound effects (e.g., explosions, wind, impacts, baby crying, lasers). Push the engine to sound as realistic and 'Suno-instrumental' level as possible.
        7. **Dynamic Structure:** Use the 'structure' array to sequence at least four **different** phrase types (e.g., Intro, Verse, Chorus, Bridge, Outro) and repeat them in a **non-linear, evolving** way.

        **CRITICAL RULES:**
        1. You MUST generate **ONLY** a valid JSON object. Do not include any text or markdown formatting outside of the JSON block.
        2. Instrument types MUST be one of: 'Synth', 'AMSynth', 'FMSynth', 'MembraneSynth', 'Sampler', 'NoiseSynth', 'MetalSynth', 'PluckSynth'.
        3. For any instrument options, the 'oscillator.type' must be one of the standard types: 'sine', 'square', 'triangle', or 'sawtooth'. DO NOT use 'noise' as an oscillator type.
        4. Use standard musical note notation (e.g., 'C4', 'D#3', 'A5'). Use 'rest', '0', or 'null' for silence. Chords must be arrays of notes (e.g.,["C4", "E4", "G4"]).
        5. The final rendered music MUST NOT EXCEED 5 MINUTES of length.`;
	const payload = {
		contents: [
			{
				parts: [
					{
						text: prompt
					}
				]
			}
		],
		systemInstruction: {
			parts: [
				{
					text: systemPrompt
				}
			]
		},
		generationConfig: {
			responseMimeType: "application/json",
			responseSchema: {
				type: "OBJECT",
				properties: {
					tempo: {
						type: "NUMBER"
					},
					master_reverb_decay: {
						type: "NUMBER"
					},
					structure: {
						type: "ARRAY",
						items: {
							type: "STRING"
						}
					},
					instruments: {
						type: "ARRAY",
						items: {
							type: "OBJECT",
							properties: {
								name: {
									type: "STRING"
								},
								type: {
									type: "STRING",
									enum: [
										"Synth",
										"AMSynth",
										"FMSynth",
										"MembraneSynth",
										"Sampler",
										"NoiseSynth",
										"MetalSynth",
										"PluckSynth"
									]
								},
								options: {
									type: "OBJECT",
									description:
										"Optional Tone.js settings for the instrument (e.g., oscillator type, envelope).",
									properties: {
										_tone_setting_: {
											type: "STRING",
											description:
												"This is a placeholder. The model should include actual Tone.js properties like 'oscillator.type' or 'envelope.attack' here, which will be accepted even if not explicitly defined in this schema."
										}
									},
									required: []
								}
							},
							required: ["name", "type"]
						}
					},
					phrases_list: {
						type: "ARRAY",
						items: {
							type: "OBJECT",
							properties: {
								phrase_name: {
									type: "STRING"
								},
								duration_measures: {
									type: "NUMBER"
								},
								patterns: {
									type: "ARRAY",
									items: {
										type: "OBJECT",
										properties: {
											instrument_name: {
												type: "STRING"
											},
											sequence: {
												type: "ARRAY",
												items: {
													type: "STRING"
												}
											},
											subdivision: {
												type: "STRING"
											},
											note_duration: {
												type: "STRING"
											},
											noise_modulation_depth: {
												type: "NUMBER"
											}
										},
										required: ["instrument_name", "sequence", "subdivision"]
									}
								}
							},
							required: ["phrase_name", "duration_measures", "patterns"]
						}
					}
				},
				required: ["tempo", "structure", "instruments", "phrases_list"]
			}
		}
	};
	const data = await fetchWithRetry(
		GEMINI_API_ENDPOINT,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(payload)
		},
		500
	);
	let jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
	if (!jsonText) {
		throw new Error("Received empty content from the model.");
	}
	const markdownFenceRegex = /^\s*```json\s*|```\s*$/g;
	jsonText = jsonText.replace(markdownFenceRegex, "").trim();
	try {
		return JSON.parse(jsonText);
	} catch (parseError) {
		throw new Error(
			`JSON parsing failed: ${
				parseError.message
			}. Content received was: ${jsonText.substring(0, 100)}...`
		);
	}
}

async function generateAndRenderMusicInChat(prompt, containerId) {
	const container = document.getElementById(containerId);
	if (!container) return;
	try {
		if (typeof Tone === "undefined") {
			container.innerHTML =
				"<p style='color: #ffcc00;'>Error: Tone.js library is not loaded.</p>";
			return;
		}
		if (Tone.context.state !== "running") {
			await Tone.start();
		}
		container.innerHTML =
			"<p style='color: #6c99e0;'>Generating music score...</p>";
		const musicData = await getMusicJson(prompt);
		const totalDuration = calculateDurationFromMusicData(musicData);
		if (totalDuration < 1) {
			throw new Error("Generated music structure is too short.");
		}
		const renderedBuffer = await renderPhraseByPhrase(
			musicData,
			totalDuration,
			(status) => {
				container.innerHTML = `<p style='color: #6c99e0;'>${status}</p>`;
			}
		);
		container.innerHTML = "<p style='color: #6c99e0;'>Encoding audio...</p>";
		const audioBlob = bufferToWave(renderedBuffer);
		const audioUrl = URL.createObjectURL(audioBlob);
		const audioPlayer = document.createElement("audio");
		audioPlayer.src = audioUrl;
		audioPlayer.controls = true;
		audioPlayer.style.width = "100%";
		audioPlayer.onended = () => {
			URL.revokeObjectURL(audioUrl);
		};
		container.innerHTML = "";
		container.appendChild(audioPlayer);
	} catch (error) {
		container.innerHTML = `<p style='color: #ff4d4d;'>Music Generation Failed: ${error.message}</p>`;
	}
}

const mockSearchResults = JSON.stringify([
	{
		title: "Google Search Result 1",
		snippet: "This is a mock search result to demonstrate tool usage.",
		link: "https://example.com/1"
	},
	{
		title: "Google Search Result 2",
		snippet: "Another mock search result.",
		link: "https://example.com/2"
	}
]);

async function fetchWithRetry(url, options, initialDelay = 500) {
	let attempt = 0;
	let response;
	let errorData = null;
	let currentUrl = url;
	const switchKey = () => {
		currentKeyIndex = (currentKeyIndex + 1) % HIDDEN_KEYS.length;
		const newKey = decodeKey(HIDDEN_KEYS[currentKeyIndex]);
		try {
			const urlObj = new URL(currentUrl);
			urlObj.searchParams.set("key", newKey);
			currentUrl = urlObj.toString();
		} catch (e) {
			if (currentUrl.includes("key=")) {
				currentUrl = currentUrl.replace(/key=[^&]+/, `key=${newKey}`);
			}
		}
		GEMINI_API_ENDPOINT = getCurrentEndpoint();
	};
	while (true) {
		attempt++;
		try {
			if (options.signal && options.signal.aborted) {
				const e = new Error("Aborted");
				e.name = "AbortError";
				throw e;
			}
			response = await fetch(currentUrl, options);
			if (!response.ok) {
				if ([400, 403, 404, 429, 500, 502, 503, 504].includes(response.status)) {
					switchKey();
					continue;
				}
				try {
					errorData = await response.json();
				} catch (jsonError) {
					errorData = null;
				}
				if (errorData) {
					const msg = errorData.error?.message || JSON.stringify(errorData);
					if (
						msg.toLowerCase().includes("overloaded") ||
						msg.toLowerCase().includes("key") ||
						msg.toLowerCase().includes("quota")
					) {
						switchKey();
						continue;
					}
					throw new Error(`API Error after retries: ${msg}`);
				} else {
					throw new Error(`HTTP Error after retries: Status ${response.status}`);
				}
			}
			removeStatusMessage();
			return await response.json();
		} catch (error) {
			if (error.name === "AbortError") throw error;
			const delay = initialDelay * Math.pow(1.5, attempt - 1);
			await new Promise((resolve) => setTimeout(resolve, delay));
			continue;
		}
	}
}

function updateStatusMessage(text) {
	if (
		currentStatusMessageElement &&
		chatBox.contains(currentStatusMessageElement)
	) {
		chatBox.removeChild(currentStatusMessageElement);
	}
	const statusMessage = document.createElement("div");
	statusMessage.className = "message bot status";
	statusMessage.innerText = text;
	chatBox.appendChild(statusMessage);
	chatBox.scrollTop = chatBox.scrollHeight;
	currentStatusMessageElement = statusMessage;
}

function removeStatusMessage() {
	if (
		currentStatusMessageElement &&
		chatBox.contains(currentStatusMessageElement)
	) {
		chatBox.removeChild(currentStatusMessageElement);
	}
	currentStatusMessageElement = null;
}

function resizeInputArea() {
	userInput.style.height = "auto";
	const newHeight = Math.min(userInput.scrollHeight, MAX_INPUT_HEIGHT);
	userInput.style.height = newHeight + "px";
	userInput.style.overflowY =
		userInput.scrollHeight > MAX_INPUT_HEIGHT ? "auto" : "hidden";
}
userInput.addEventListener("input", resizeInputArea);
userInput.addEventListener("keydown", function (e) {
	const isMobile = navigator.userAgent.match(
		/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
	);
	if (e.key === "Enter") {
		if (isMobile) {
			return;
		}
		if (!e.shiftKey) {
			e.preventDefault();
			if (!isWaitingForToolExecution && !isProcessing) {
				sendMessage();
			}
		}
	}
});

document.addEventListener("keydown", (e) => {
	if (e.key === "Escape") {
		if (isProcessing || isWaitingForToolExecution) {
			if (
				confirm(
					"Generation is in progress. Are you sure you want to stop? (ESC pressed)"
				)
			) {
				if (currentAbortController) {
					stopGeneration();
				}
			}
		} else if (userInput.innerText.trim().length > 0) {
			if (
				confirm(
					"You have typed text. Are you sure you want to clear it? (ESC pressed)"
				)
			) {
				userInput.innerText = "";
				resizeInputArea();
			}
		}
	}
});

document.addEventListener("DOMContentLoaded", () => {
	loadChatsList();
	const chatsMeta = JSON.parse(
		localStorage.getItem(CHATS_STORAGE_KEY + "_meta") || "[]"
	);
	if (chatsMeta.length > 0) {
		loadChat(chatsMeta[0].id);
	} else {
		addMessage("Hello! I'm Beweble Ai and I'm ready to chat. How can I help you today?I was programmed by rida jomaa.", "bot");
	}
	resizeInputArea();
	setupDragAndDrop();
	setupPasteHandler();
});
sendBtn.addEventListener("click", () => {
	if (currentAbortController) {
		stopGeneration();
	} else if (!isWaitingForToolExecution && !isProcessing) {
		sendMessage();
	}
});
historyBtn.addEventListener("click", () => {
	loadChatsList();
	historyPanel.classList.add("visible");
});
closeHistoryBtn.addEventListener("click", () => {
	historyPanel.classList.remove("visible");
});
clearHistoryBtn.addEventListener("click", () => {
	if (
		confirm(
			"Are you sure you want to clear all chat history? This cannot be undone."
		)
	) {
		clearChatHistory();
	}
});
fileInput.addEventListener("change", handleFileSelect);

function handleFileSelect(event) {
	const newFiles = Array.from(event.target.files);
	selectedFiles = selectedFiles.concat(newFiles);
	displaySelectedFiles();
}

function setupDragAndDrop() {
	document.body.addEventListener("dragover", (e) => {
		e.preventDefault();
		document.body.style.opacity = "0.7";
	});
	document.body.addEventListener("dragleave", (e) => {
		e.preventDefault();
		document.body.style.opacity = "1";
	});
	document.body.addEventListener("drop", (e) => {
		e.preventDefault();
		document.body.style.opacity = "1";
		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			const files = Array.from(e.dataTransfer.files);
			selectedFiles = selectedFiles.concat(files);
			displaySelectedFiles();
		}
	});
}

function setupPasteHandler() {
	userInput.addEventListener("paste", (e) => {
		if (e.clipboardData.files && e.clipboardData.files.length > 0) {
			e.preventDefault();
			const files = Array.from(e.clipboardData.files);
			selectedFiles = selectedFiles.concat(files);
			displaySelectedFiles();
			return;
		}
		e.preventDefault();
		const text = (e.clipboardData || window.clipboardData).getData("text/plain");
		if (document.queryCommandSupported("insertText")) {
			document.execCommand("insertText", false, text);
		} else {
			const range = document.getSelection().getRangeAt(0);
			range.deleteContents();
			const textNode = document.createTextNode(text);
			range.insertNode(textNode);
			range.collapse(false);
		}
	});
}

function displaySelectedFiles() {
	selectedFilesDisplay.innerHTML = "";
	if (selectedFiles.length === 0) {
		selectedFilesDisplay.innerText = "";
		return;
	}
	const fileNames = selectedFiles.map((file) => file.name);
	selectedFilesDisplay.innerText = `Selected: ${fileNames.join(", ")}`;
	fileInput.value = "";
}

function clearSelectedFiles() {
	selectedFiles = [];
	displaySelectedFiles();
}

function escapeHTML(str) {
	const div = document.createElement("div");
	div.appendChild(document.createTextNode(str));
	return div.innerHTML;
}

function downloadModelAsFile(content, fileName, mimeType) {
	const blob = new Blob([content], {
		type: mimeType
	});
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

function addDownloadButtonListeners(messageElement) {
	messageElement.querySelectorAll(".download-btn").forEach((button) => {
		if (button.dataset.listenerAttached) return;
		button.dataset.listenerAttached = true;
		button.addEventListener("click", () => {
			const fileName = button.dataset.filename;
			const mimeType = button.dataset.mimetype;
			const content = button.dataset.content;
			downloadModelAsFile(atob(content), fileName, mimeType);
		});
	});
}

function formatAIResponse(text) {
	const escapeHTML = (str) => {
		if (typeof str !== "string") return "";
		return str
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	};

	// Process code blocks first to protect them from MathJax and other formatting
	const codeBlocks = [];
	let formattedText = text.replace(
		/^```(\w+)?\n([\s\S]*?)```/gm,
		(match, lang, codeContent) => {
			codeBlocks.push({ lang: lang || "", content: codeContent.trim() });
			return `CODEBLOCK_PLACEHOLDER_${codeBlocks.length - 1}`;
		}
	);

	const inlineCodeBlocks = [];
	formattedText = formattedText.replace(
		/`([^`\n]+?)`/g,
		(match, codeContent) => {
			inlineCodeBlocks.push(codeContent.trim());
			return `INLINECODE_PLACEHOLDER_${inlineCodeBlocks.length - 1}`;
		}
	);

	// Now process Math blocks safely
	const mathBlocks = [];
	formattedText = formattedText.replace(
		/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$(?!\s)[^$]*?(?<!\s)\$)/g,
		(match) => {
			mathBlocks.push(match);
			return `MATHJAXBLOCK${mathBlocks.length - 1}ENDBLOCK`;
		}
	);

	formattedText = formattedText.replace(
		/!\[downloadable_file:\s*(.*?)\s*\|\s*(.*?)\s*\|([\s\S]*?)\]!/g,
		(match, fileName, mimeType, content) => {
			const safeFileName = escapeHTML(fileName.trim());
			const safeMimeType = escapeHTML(mimeType.trim());
			const base64Content = btoa(content);
			return `<button class="download-btn" data-filename="${safeFileName}" data-mimetype="${safeMimeType}" data-content="${base64Content}">Download ${safeFileName}</button>`;
		}
	);

	const lines = formattedText.split("\n");
	const outputLines = [];
	let listStack = [];
	let inTable = false;
	let blockquoteContent = [];
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		let trimmedLine = line.trim();
		let leadingSpaces = line.search(/\S|$/);
		if (blockquoteContent.length > 0 && !trimmedLine.startsWith(">")) {
			outputLines.push(
				`<blockquote>${blockquoteContent.join("\n").trim()}</blockquote>`
			);
			blockquoteContent = [];
		}
		if (trimmedLine.startsWith(">")) {
			blockquoteContent.push(trimmedLine.substring(1).trim());
			continue;
		}
		if (inTable && (!trimmedLine.startsWith("|") || trimmedLine === "")) {
			outputLines.push("</tbody></table></div>");
			inTable = false;
		}
		while (
			listStack.length > 0 &&
			leadingSpaces <= listStack[listStack.length - 1].indent &&
			!/^\s*(\*|\-|\d+\.)\s+/.test(line)
		) {
			const listTag = listStack.pop().tag;
			outputLines.push(`</${listTag}>`);
		}
		if (!inTable) {
			if (trimmedLine.match(/^#{1,6}\s/)) {
				const level = trimmedLine.indexOf(" ");
				const tag = `h${level}`;
				outputLines.push(`<${tag}>${trimmedLine.substring(level).trim()}</${tag}>`);
				continue;
			} else if (trimmedLine.startsWith("---") || trimmedLine.startsWith("***")) {
				outputLines.push(`<hr>`);
				continue;
			}
		}
		if (trimmedLine.startsWith("|") && !inTable) {
			if (
				i + 1 < lines.length &&
				lines[i + 1].trim().match(/^\|[ \t]*[:\-]+[ \t]*\|/)
			) {
				inTable = true;
				outputLines.push('<div style="overflow-x:auto;"><table><thead><tr>');
				const headers = trimmedLine
					.split("|")
					.map((h) => h.trim())
					.filter((h) => h);
				outputLines.push(
					`<th>${headers.join("</th><th>")}</th></tr></thead><tbody>`
				);
				i++;
				continue;
			}
		} else if (inTable && trimmedLine.startsWith("|")) {
			let rowContent = trimmedLine.replace(/^\|/, "").replace(/\|$/, "").trim();
			const cells = rowContent
				.split("|")
				.map((c) => c.trim())
				.filter((c) => true);
			if (cells.length > 0) {
				outputLines.push(`<tr><td>${cells.join("</td><td>")}</td></tr>`);
			}
			continue;
		}
		const listItemMatch = line.match(/^(\s*)(\*|\-|\d+\.)\s+(.*)/);
		if (listItemMatch) {
			const [, indentString, marker, content] = listItemMatch;
			const currentIndent = indentString.length;
			const listType = marker.match(/^\d+\./) ? "ol" : "ul";
			while (
				listStack.length > 0 &&
				currentIndent < listStack[listStack.length - 1].indent
			) {
				outputLines.push(`</${listStack.pop().tag}>`);
			}
			if (
				listStack.length === 0 ||
				currentIndent > listStack[listStack.length - 1].indent ||
				listStack[listStack.length - 1].tag !== listType
			) {
				listStack.push({ tag: listType, indent: currentIndent });
				outputLines.push(`<${listType}>`);
			}
			if (
				listStack.length > 0 &&
				listStack[listStack.length - 1].tag !== listType &&
				currentIndent === listStack[listStack.length - 1].indent
			) {
				outputLines.push(`</${listStack.pop().tag}>`);
				listStack.push({ tag: listType, indent: currentIndent });
				outputLines.push(`<${listType}>`);
			}
			outputLines.push(`<li>${content.trim()}</li>`);
			continue;
		}
		outputLines.push(line);
	}
	if (blockquoteContent.length > 0) {
		outputLines.push(
			`<blockquote>${blockquoteContent.join("\n").trim()}</blockquote>`
		);
	}
	while (listStack.length > 0) outputLines.push(`</${listStack.pop().tag}>`);
	if (inTable) outputLines.push("</tbody></table></div>");
	formattedText = outputLines.join("\n");
	formattedText = formattedText.replace(/^\s*\n/gm, "\n");
	formattedText = formattedText.replace(/(\n\s*){3,}/g, "\n\n");
	formattedText = formattedText.replace(
		/!\[([^\]]*)\]\(([^)]+?)(?:\s+["'](.+?)["'])?\)/g,
		(match, altText, url, title) => {
			const escapedUrl = escapeHTML(url);
			const escapedAlt = escapeHTML(altText || "");
			const escapedTitle = escapeHTML(title || "");
			const titleAttr = escapedTitle ? ` title="${escapedTitle}"` : "";
			return `<img src="${escapedUrl}" alt="${escapedAlt}"${titleAttr} style="max-width:100%; height:auto;">`;
		}
	);
	formattedText = formattedText.replace(
		/(?<!["'`])\b(https?|ftp|file):\/\/[^\s]+?(?=[.,;!?]?(\s|$))/g,
		(match) => {
			let url = match.trim();
			if (url.endsWith(")")) {
				url = url.substring(0, url.length - 1);
			}
			return `<a href="${escapeHTML(
				url
			)}" target="_blank" class="highlight-link">${url}</a>`;
		}
	);
	formattedText = formattedText.replace(
		/\[([^\]]+?)\]\(([^)]+?)\)/g,
		(match, linkText, url) => {
			return `<a href="${escapeHTML(
				url
			)}" target="_blank" class="highlight-link">${linkText}</a>`;
		}
	);

	formattedText = formattedText.replace(
		/~~([^~]+?)~~/g,
		(match, strikeContent) => {
			return `<del>${strikeContent.trim()}</del>`;
		}
	);
	formattedText = formattedText.replace(
		/\*\*([^\*]+?)\*\*/g,
		(match, boldContent) => {
			return `<strong>${boldContent.trim()}</strong>`;
		}
	);
	formattedText = formattedText.replace(/~([^~\s]+?)~/g, (match, subContent) => {
		return `<sub>${subContent.trim()}</sub>`;
	});
	formattedText = formattedText.replace(
		/\^([^\^\s]+?)\^/g,
		(match, supContent) => {
			return `<sup>${supContent.trim()}</sup>`;
		}
	);
	formattedText = formattedText.replace(
		/\[\[([^\]]+?)\]\]/g,
		(match, keyContent) => {
			return `<kbd>${keyContent.trim()}</kbd>`;
		}
	);
	formattedText = formattedText.replace(
		/([*_])([^\n]+?)\1/g,
		(match, marker, content) => {
			if (
				content.trim().startsWith("<") ||
				content.trim().endsWith(">") ||
				match.startsWith("**")
			)
				return match;
			if (marker === "*" || marker === "_") {
				return `<em>${content.trim()}</em>`;
			}
			return match;
		}
	);
	formattedText = formattedText
		.split("\n\n")
		.map((paragraph) => {
			const trimmed = paragraph.trim();
			if (!trimmed) return "";
			const isBlockLevel =
				trimmed.toLowerCase().startsWith("<h") ||
				trimmed.toLowerCase().startsWith("<pre") ||
				trimmed.toLowerCase().startsWith("<ul") ||
				trimmed.toLowerCase().startsWith("<ol") ||
				trimmed.toLowerCase().startsWith("<li") ||
				trimmed.toLowerCase().startsWith("<blockquote") ||
				trimmed.toLowerCase().startsWith("<hr") ||
				trimmed.toLowerCase().startsWith("<table") ||
				trimmed.toLowerCase().startsWith("<div") ||
				trimmed.toLowerCase().startsWith("<img") ||
				trimmed.toLowerCase().startsWith("<button");
			if (isBlockLevel) {
				return paragraph;
			}
			const contentWithBr = trimmed.replace(/\n/g, "<br>");
			return `<p>${contentWithBr}</p>`;
		})
		.join("\n");

	formattedText = formattedText.replace(
		/INLINECODE_PLACEHOLDER_(\d+)/g,
		(match, index) => {
			return `<code>${escapeHTML(inlineCodeBlocks[parseInt(index)])}</code>`;
		}
	);

	formattedText = formattedText.replace(
		/CODEBLOCK_PLACEHOLDER_(\d+)/g,
		(match, index) => {
			const block = codeBlocks[parseInt(index)];
			const languageClass = block.lang
				? `language-${block.lang.toLowerCase()}`
				: "";
			return `<pre><code class="${languageClass}">${escapeHTML(
				block.content
			)}</code></pre>`;
		}
	);

	formattedText = formattedText.replace(
		/MATHJAXBLOCK(\d+)ENDBLOCK/g,
		(match, index) => {
			return mathBlocks[parseInt(index)];
		}
	);
	return formattedText;
}

function addCopyButtonsToCodeBlocks(messageElement) {
	const codeBlocks = messageElement.querySelectorAll("pre code");
	codeBlocks.forEach((codeElement) => {
		const preElement = codeElement.parentElement;
		if (preElement.querySelector(".copy-code-btn")) return;
		const copyButton = document.createElement("button");
		copyButton.className = "copy-code-btn";
		copyButton.innerText = "Copy";
		copyButton.addEventListener("click", () => {
			const codeText = codeElement.innerText;
			if (navigator.clipboard && window.isSecureContext) {
				navigator.clipboard
					.writeText(codeText)
					.then(() => {
						copyButton.innerText = "Copied!";
						setTimeout(() => {
							copyButton.innerText = "Copy";
						}, 1500);
					})
					.catch(() => {
						fallbackCopyTextToClipboard(codeText, copyButton);
					});
			} else {
				fallbackCopyTextToClipboard(codeText, copyButton);
			}
		});
		preElement.appendChild(copyButton);
	});
}

function fallbackCopyTextToClipboard(text, button) {
	const textArea = document.createElement("textarea");
	textArea.value = text;
	textArea.style.position = "fixed";
	textArea.style.top = "0";
	textArea.style.left = "0";
	textArea.style.width = "1px";
	textArea.style.height = "1px";
	textArea.style.opacity = "0";
	document.body.appendChild(textArea);
	textArea.focus();
	textArea.select();
	let successful;
	try {
		successful = document.execCommand("copy");
	} catch (err) {
		successful = false;
	}
	document.body.removeChild(textArea);
	if (successful) {
		button.innerText = "Copied!";
	} else {
		button.innerText = "Cannot copy";
	}
	setTimeout(() => {
		button.innerText = "Copy";
	}, 1500);
}

function addRewriteButton(botMessageElement) {
	const rewriteButton = document.createElement("button");
	rewriteButton.className = "rewrite-btn";
	rewriteButton.innerText = "Rewrite";
	rewriteButton.addEventListener("click", () => {
		if (lastUserMessageText && !isWaitingForToolExecution && !isProcessing) {
			userInput.innerText = lastUserMessageText;
			resizeInputArea();
			sendMessage();
		}
	});
	const timestampElement = botMessageElement.querySelector(".timestamp");
	if (timestampElement) {
		timestampElement.parentElement.insertBefore(
			rewriteButton,
			timestampElement.nextSibling
		);
	}
}

function handleEditMessage(timestamp) {
	const index = conversationHistory.findIndex((m) => m.timestamp === timestamp);
	if (index === -1) return;
	const textToEdit =
		conversationHistory[index].parts.find((p) => p.text)?.text || "";
	userInput.innerText = textToEdit;
	resizeInputArea();
	conversationHistory = conversationHistory.slice(0, index);
	saveChat();
	renderConversationHistory();
}

function renderThreeJSModel(jsCode, containerId) {
	const container = document.getElementById(containerId);
	if (!container) return;
	if (typeof THREE === "undefined") {
		container.innerHTML =
			"<p style='color: #ffcc00; padding: 10px;'>Error: Three.js library is not loaded.</p>";
		return;
	}
	try {
		const F = new Function(
			"THREE",
			"OrbitControls",
			"RGBELoader",
			"container",
			jsCode
		);
		F(THREE, OrbitControls, RGBELoader, container);
	} catch (e) {
		container.innerHTML = `<p style='color: #ff4d4d; padding: 10px;'>Error rendering 3D model: ${e.message}</p>`;
	}
}

function renderGeometry(code, containerId) {
	const container = document.getElementById(containerId);
	if (!container) return;
	container.innerHTML = "";
	try {
		const F = new Function("d3", "container", code);
		F(d3, container);
	} catch (e) {
		container.innerHTML = `<p style='color: #ff4d4d; padding: 10px;'>Geometry Error: ${e.message}</p>`;
	}
}

async function getSpotifyToken() {
	if (spotifyToken && Date.now() < spotifyTokenExpiry) return spotifyToken;
	const creds = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
	const res = await fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: {
			Authorization: `Basic ${creds}`,
			"Content-Type": "application/x-www-form-urlencoded"
		},
		body: "grant_type=client_credentials"
	});
	if (!res.ok) throw new Error("Spotify Auth Failed");
	const data = await res.json();
	spotifyToken = data.access_token;
	spotifyTokenExpiry = Date.now() + data.expires_in * 1000;
	return spotifyToken;
}

async function renderSpotifyEmbed(query, containerId) {
	const container = document.getElementById(containerId);
	try {
		container.innerHTML = "<p style='color: #1DB954;'>Searching Spotify...</p>";
		const token = await getSpotifyToken();
		const performSearch = async (q) => {
			const typeParam = "track,artist,album,playlist,show,episode";
			const res = await fetch(
				`https://api.spotify.com/v1/search?q=${encodeURIComponent(
					q
				)}&type=${typeParam}&limit=1`,
				{
					headers: { Authorization: `Bearer ${token}` }
				}
			);
			if (!res.ok) return null;
			return await res.json();
		};
		let data = await performSearch(query);
		let searchTypes = [
			"tracks",
			"artists",
			"albums",
			"playlists",
			"shows",
			"episodes"
		];
		if (query.includes("artist:"))
			searchTypes = [
				"artists",
				"tracks",
				"albums",
				"playlists",
				"shows",
				"episodes"
			];
		else if (query.includes("track:"))
			searchTypes = [
				"tracks",
				"artists",
				"albums",
				"playlists",
				"shows",
				"episodes"
			];
		else if (query.includes("album:"))
			searchTypes = [
				"albums",
				"tracks",
				"artists",
				"playlists",
				"shows",
				"episodes"
			];
		else if (query.includes("playlist:"))
			searchTypes = [
				"playlists",
				"tracks",
				"albums",
				"artists",
				"shows",
				"episodes"
			];
		else if (query.includes("show:") || query.includes("podcast:"))
			searchTypes = [
				"shows",
				"episodes",
				"tracks",
				"albums",
				"artists",
				"playlists"
			];
		let item = null;
		const findItem = (d) => {
			if (!d) return null;
			for (const t of searchTypes) {
				if (d[t] && d[t].items && d[t].items.length > 0) {
					return d[t].items[0];
				}
			}
			return null;
		};
		item = findItem(data);
		if (!item && query.includes(":")) {
			const rawQuery = query
				.replace(/(track:|artist:|album:|playlist:|show:|episode:)/gi, " ")
				.replace(/\s+/g, " ")
				.trim();
			if (rawQuery && rawQuery !== query) {
				data = await performSearch(rawQuery);
				item = findItem(data);
			}
		}
		if (item) {
			const type = item.type;
			const id = item.id;
			const embedUrl = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
			const heightClass =
				type === "album" || type === "playlist" || type === "show" ? "352" : "152";
			container.innerHTML = `<iframe style="border-radius:12px" src="${embedUrl}" width="100%" height="${heightClass}" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
		} else {
			container.innerHTML =
				"<p style='color: #ff4d4d;'>No Spotify results found.</p>";
		}
	} catch (e) {
		container.innerHTML = `<p style='color: #ff4d4d;'>Spotify Error: ${e.message}</p>`;
	}
}

function renderMapsRoute(origin, destination, waypoints, mode, containerId) {
	const container = document.getElementById(containerId);
	if (!container) return;
	let waypointsArray = [];
	if (waypoints) {
		if (waypoints.includes(";")) {
			waypointsArray = waypoints
				.split(";")
				.map((w) => w.trim())
				.filter((w) => w.length > 0);
		} else {
			const parts = waypoints.split(",").map((p) => p.trim());
			const isNumber = (s) => /^-?\d+(\.\d+)?$/.test(s);
			for (let i = 0; i < parts.length; i++) {
				if (isNumber(parts[i]) && i + 1 < parts.length && isNumber(parts[i + 1])) {
					waypointsArray.push(`${parts[i]}, ${parts[i + 1]}`);
					i++;
				} else {
					waypointsArray.push(parts[i]);
				}
			}
		}
	}
	const clean = (s) => encodeURIComponent(s.trim());
	const originEnc = clean(origin);
	const destEnc = clean(destination);
	let dirUrl = `https://www.google.com/maps/dir/?api=1&origin=${originEnc}&destination=${destEnc}`;
	if (waypointsArray.length > 0) {
		dirUrl += `&waypoints=${waypointsArray.map(clean).join("|")}`;
	}
	dirUrl += `&travelmode=driving`;
	let embedQuery = `from: ${origin} `;
	waypointsArray.forEach((wp) => {
		embedQuery += `to: ${wp} `;
	});
	embedQuery += `to: ${destination}`;
	const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
		embedQuery
	)}&t=&z=10&ie=UTF8&iwloc=&output=embed`;
	let timelineHtml = `<div class="maps-timeline">`;
	timelineHtml += `<div class="maps-step start"><div class="maps-step-content"><span class="maps-location">${origin}</span><span class="maps-label">Start Point</span></div></div>`;
	waypointsArray.forEach((wp, index) => {
		timelineHtml += `<div class="maps-step waypoint"><div class="maps-step-content"><span class="maps-location">${wp}</span><span class="maps-label">Stop ${
			index + 1
		}</span></div></div>`;
	});
	timelineHtml += `<div class="maps-step end"><div class="maps-step-content"><span class="maps-location">${destination}</span><span class="maps-label">Destination</span></div></div>`;
	timelineHtml += `</div>`;
	container.innerHTML = `
        <div class="maps-route-header">
            <div class="maps-header-title">
                 <div class="maps-header-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"></path></svg>
                 </div>
                 <span>AI Optimal Route</span>
            </div>
            <div class="maps-header-mode">${mode || "Driving"}</div>
        </div>
        ${timelineHtml}
        <iframe class="maps-embed-frame" src="${embedUrl}" allowfullscreen loading="lazy"></iframe>
        <div class="maps-actions">
            <a href="${dirUrl}" target="_blank" class="maps-btn maps-btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
                Navigate Now
            </a>
        </div>
    `;
}

function toggleStudyMode(enabled) {
	isStudyMode = enabled;
	if (enabled) {
		document.body.classList.add("study-mode");
		const element = document.documentElement;
		if (element.requestFullscreen && !document.fullscreenElement) {
			element.requestFullscreen().catch((err) => {});
		}
		const state = loadStudyState();
		if (state && state.paused) {
			studySeconds = state.elapsed;
			isStudyPaused = true;
			let timerUI = document.getElementById("study-timer-container");
			if (!timerUI) {
				timerUI = document.createElement("div");
				timerUI.id = "study-timer-container";
				timerUI.innerHTML = `<span id="study-timer-text">00:00</span> <button id="study-timer-pause-btn" class="timer-btn" title="Pause/Resume Study">▶</button>`;
				document.body.appendChild(timerUI);
				document
					.getElementById("study-timer-pause-btn")
					.addEventListener("click", toggleStudyPause);
			}
			timerUI.style.display = "flex";
			timerUI.classList.add("paused");
			updateTimerUI();
		} else {
			startStudyTimer(state ? state.elapsed : 0);
		}
	} else {
		document.body.classList.remove("study-mode");
		if (document.exitFullscreen && document.fullscreenElement) {
			document.exitFullscreen().catch((err) => {});
		}
		if (!isStudyPaused) {
			stopStudyTimer();
		}
	}
}

async function exitStudyMode(tellAI = false) {
	toggleStudyMode(false);
	stopStudyTimer();
	isStudyMode = false;
	isStudyPaused = false;
	if (tellAI) {
		const userMessage = {
			role: "user",
			timestamp: new Date().toISOString(),
			parts: [{ text: "SYSTEM: User manually ended Study Mode." }]
		};
		conversationHistory.push(userMessage);
		continueChatWithContext();
	} else {
		addMessage(
			"Study session ended. Returning to normal chat.",
			"bot",
			new Date()
		);
		isWaitingForToolExecution = false;
		lastUserMessageText = "";
		saveChat();
	}
}

function renderStudyForm(questions, containerId) {
	const container = document.getElementById(containerId);
	if (!container) return;
	const hasStudyStarted = conversationHistory.some(
		(msg) =>
			msg.role === "user" &&
			msg.parts.some(
				(p) =>
					p.text &&
					p.text.includes("User has completed the Study Mode questionnaire")
			)
	);
	if (hasStudyStarted) {
		container.style.display = "none";
		return;
	}
	let formHTML = `<div class="study-form"><p style="color: #6c99e0; margin-bottom: 15px;">To personalize the experience, please answer the following:</p>`;
	questions.forEach((q, index) => {
		formHTML += `
            <div class="study-form-item">
                <label class="study-form-label">${index + 1}) ${q}</label>
                <input type="text" class="study-form-input" id="study-q${index}" placeholder="Your answer...">
            </div>
        `;
	});
	formHTML += `<button class="study-submit-btn" id="study-submit-btn">Start Study Mode</button></div>`;
	container.innerHTML = formHTML;
	document.getElementById("study-submit-btn").addEventListener("click", () => {
		const answers = [];
		for (let i = 0; i < questions.length; i++) {
			const val = document.getElementById(`study-q${i}`).value;
			answers.push(`Question: ${questions[i]} \nAnswer: ${val}`);
		}
		container.innerHTML = `<p class="loading-sequence-text" id="study-loading-text">(Loading modules...)</p>`;
		runStudyLoadingSequence(container, answers.join("\n"));
	});
}

function runStudyLoadingSequence(container, answersText) {
	const textEl = container.querySelector("#study-loading-text");
	const stages = [
		"(Extracting modules...)",
		"(Personalizing Experience...)",
		"(Starting...)",
		"(Done!)"
	];
	let step = 0;
	const interval = setInterval(() => {
		if (step < stages.length) {
			textEl.innerText = stages[step];
			step++;
		} else {
			clearInterval(interval);
			toggleStudyMode(true);
			const studyPrompt = `
                SYSTEM: User has completed the Study Mode questionnaire.
                User Responses:
                ${answersText}
                
                RULES FOR STUDY MODE:
                1. NO DISTRACTIONS. Do not discuss off-topic things unless used as an analogy.
                2. Be highly pedagogical. Check for understanding.
                3. If you make a mistake, CORRECT IT IMMEDIATELY.
                4. Start now by introducing the topic based on their answers.
            `;
			conversationHistory.push({ role: "user", parts: [{ text: studyPrompt }] });
			continueChatWithContext();
		}
	}, 800);
}

function addMessage(
	content,
	sender,
	timestamp = new Date(),
	fileInfo = null,
	sources = null
) {
	const message = document.createElement("div");
	message.className = `message ${sender}`;
	message.dataset.timestamp = timestamp;
	const contentElement = document.createElement("div");
	contentElement.className = "content";
	let textForDisplay = content;
	let rendererId = null;
	let jsCode = null;
	let musicPrompt = null;
	let musicContainerId = null;
	let spotifyQuery = null;
	let spotifyContainerId = null;
	let mapsData = null;
	let mapsContainerId = null;
	let weatherData = null;
	let newsData = null;
	let pythonCode = null;
	let pythonContainerId = null;
	let studyFormId = null;
	let studyQuestions = null;
	let postRenderTasks = [];

	const imageTriggerRegex = /!\[pollinations_image:\s*(.*?)\s*\]/;
	const threeJsRegex = /!\[three_js_model:\s*```javascript([\s\S]*?)```\s*\]!/;
	const musicRegex = /!\[beweble_music:\s*(.*?)\s*\]/;
	const spotifyRegex = /!\[spotify:\s*(.*?)\s*\]/;
	const mapsRegex = /!\[maps_route:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\]/;
	const weatherRegex = /!\[Beweble_weather:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\]/;
	const newsRegex = /!\[Beweble_news:\s*(.*?)\s*\]/;
	const pythonRegex = /!\[Beweble_python:\s*(?:```python\n?)?([\s\S]*?)(?:```\n?)?\s*\]!/;
	const studyTriggerRegex = /!\[Beweble_STUDY_INIT:\s*(\[.*?\])\s*\]/;
	const studyEndRegex = /!\[Beweble_STUDY_END\]/;
	const geometryRegex = /!\[Beweble_geometry:\s*```javascript([\s\S]*?)```\s*\]!/g;
	const gifRegex = /!\[Beweble_gif:\s*(.*?)\s*\]/g;
	const youtubeRegex = /!\[Beweble_youtube:\s*(.*?)\s*\]/g;
	const realImageRegex = /!\[Beweble_image:\s*(.*?)\s*\]/g;
	const screenshotRegex = /!\[Beweble_screenshot:\s*(.*?)\s*\]/g;
	const mcqRegex = /!\[Beweble_mcq:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(\d+)\s*\]/g;
	const studyPauseRegex = /!\[Beweble_STUDY_PAUSE\]/g;

	if (sender === "bot") {
		textForDisplay = textForDisplay.replace(studyPauseRegex, () => {
			setTimeout(() => {
				if (!isStudyPaused) toggleStudyPause();
			}, 500);
			return "";
		});

		textForDisplay = textForDisplay.replace(
			mcqRegex,
			(match, q, opts, correctIdx) => {
				const id = `mcq-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
				const options = opts.split(";").map((o) => o.trim());
				let html = `<div id="${id}" class="mcq-container"><div class="mcq-question">${escapeHTML(
					q
				)}</div>`;
				options.forEach((opt, idx) => {
					html += `<button class="mcq-option" data-correct="${
						idx == correctIdx
					}" onclick="this.classList.add(this.dataset.correct === 'true' ? 'correct' : 'wrong'); Array.from(this.parentElement.children).forEach(b => {if(b.tagName==='BUTTON') b.disabled=true; if(b.dataset.correct==='true') b.classList.add('correct');})">${escapeHTML(
						opt
					)}</button>`;
				});
				html += `</div>`;
				return html;
			}
		);

		textForDisplay = textForDisplay.replace(geometryRegex, (match, code) => {
			const id = `geo-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
			postRenderTasks.push({ type: "geometry", id: id, code: code });
			return `<div id="${id}" class="geometry-container"></div>`;
		});

		textForDisplay = textForDisplay.replace(gifRegex, (match, query) => {
			const url = `https://api.giphy.com/v1/gifs/translate?api_key=1XnMXhYKZniTY0axhXbC0PFKIHg2PNgX&s=${encodeURIComponent(
				query
			)}`;
			const id = `gif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
			fetch(url)
				.then((r) => r.json())
				.then((d) => {
					const el = document.getElementById(id);
					if (el && d.data && d.data.images)
						el.innerHTML = `<img src="${d.data.images.original.url}" alt="${query}" /><p style="font-size:0.7em; color:#888;">Powered by Giphy</p>`;
				});
			return `<div id="${id}" class="gif-container"><p style="color:#888;">Loading GIF: ${query}...</p></div>`;
		});

		textForDisplay = textForDisplay.replace(youtubeRegex, (match, videoId) => {
			return `<div class="youtube-embed-container"><iframe src="https://www.youtube.com/embed/${videoId.trim()}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
		});

		textForDisplay = textForDisplay.replace(realImageRegex, (match, url) => {
			return `<div class="real-image-container"><img src="${url.trim()}" alt="Search Image" /></div>`;
		});

		textForDisplay = textForDisplay.replace(screenshotRegex, (match, url) => {
			const cleanUrl = url.trim();
			const shotUrl = `https://image.thum.io/get/width/800/${cleanUrl}`;
			return `<div class="screenshot-container"><img src="${shotUrl}" alt="Screenshot of ${cleanUrl}" /></div>`;
		});

		const imageTriggerMatch = content.match(imageTriggerRegex);
		const threeJsMatch = content.match(threeJsRegex);
		const musicMatch = content.match(musicRegex);
		const spotifyMatch = content.match(spotifyRegex);
		const mapsMatch = content.match(mapsRegex);
		const weatherMatch = content.match(weatherRegex);
		const newsMatch = content.match(newsRegex);
		const pythonMatch = content.match(pythonRegex);
		const studyMatch = content.match(studyTriggerRegex);
		const studyEndMatch = content.match(studyEndRegex);

		if (pythonMatch) {
			pythonCode = pythonMatch[1];
			pythonContainerId = `python-${Date.now()}-${Math.floor(
				Math.random() * 1000
			)}`;
			textForDisplay = textForDisplay.replace(pythonRegex, "");
			const pythonContainer = document.createElement("div");
			pythonContainer.className = "python-container";
			pythonContainer.id = pythonContainerId;

			const pre = document.createElement("pre");
			pre.style.background = "#111";
			pre.style.padding = "10px";
			pre.style.borderRadius = "5px";
			const codeEl = document.createElement("code");
			codeEl.className = "language-python";
			codeEl.innerText = pythonCode;
			pre.appendChild(codeEl);

			const runBtn = document.createElement("button");
			runBtn.innerText = "Run Code in Browser";
			runBtn.className = "run-python-btn";
			runBtn.onclick = () => runPythonCode(pythonCode, pythonContainerId + "-out");

			const outputDiv = document.createElement("div");
			outputDiv.id = pythonContainerId + "-out";
			outputDiv.style.marginTop = "10px";

			pythonContainer.appendChild(pre);
			pythonContainer.appendChild(runBtn);
			pythonContainer.appendChild(outputDiv);

			contentElement.appendChild(pythonContainer);
		} else if (threeJsMatch) {
			jsCode = threeJsMatch[1];
			rendererId = `renderer-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
			textForDisplay = textForDisplay.replace(threeJsRegex, "");
			const modelContainer = document.createElement("div");
			modelContainer.className = "generated-image-container";
			modelContainer.id = rendererId;
			modelContainer.style.height = "400px";
			modelContainer.style.width = "100%";
			modelContainer.style.background = "#000";
			contentElement.appendChild(modelContainer);
		} else if (imageTriggerMatch) {
			const imageUrl = `${POLLINATIONS_AI_IMAGE_API_ENDPOINT}${encodeURIComponent(
				imageTriggerMatch[1]
			)}?nologo=true`;
			textForDisplay = textForDisplay.replace(imageTriggerRegex, "");
			const imageContainer = document.createElement("div");
			imageContainer.className = "generated-image-container";
			const imageElement = document.createElement("img");
			imageElement.src = imageUrl;
			imageElement.alt = "Generated image";
			imageContainer.appendChild(imageElement);
			contentElement.appendChild(imageContainer);
		} else if (musicMatch) {
			musicPrompt = musicMatch[1];
			musicContainerId = `music-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
			textForDisplay = textForDisplay.replace(musicRegex, "");
			const musicContainer = document.createElement("div");
			musicContainer.className = "generated-music-container";
			musicContainer.id = musicContainerId;
			musicContainer.innerHTML =
				"<p style='color: #6c99e0;'>Initializing music generator...</p>";
			contentElement.appendChild(musicContainer);
		} else if (spotifyMatch) {
			spotifyQuery = spotifyMatch[1];
			spotifyContainerId = `spotify-${Date.now()}-${Math.floor(
				Math.random() * 1000
			)}`;
			textForDisplay = textForDisplay.replace(spotifyRegex, "");
			const spotifyContainer = document.createElement("div");
			spotifyContainer.className = "spotify-container";
			spotifyContainer.id = spotifyContainerId;
			contentElement.appendChild(spotifyContainer);
		} else if (mapsMatch) {
			mapsData = {
				origin: mapsMatch[1],
				destination: mapsMatch[2],
				waypoints: mapsMatch[3],
				mode: mapsMatch[4]
			};
			mapsContainerId = `maps-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
			textForDisplay = textForDisplay.replace(mapsRegex, "");
			const mapsContainer = document.createElement("div");
			mapsContainer.className = "maps-route-container";
			mapsContainer.id = mapsContainerId;
			contentElement.appendChild(mapsContainer);
		} else if (weatherMatch) {
			weatherData = {
				location: weatherMatch[1],
				temp: weatherMatch[2],
				condition: weatherMatch[3],
				humidity: weatherMatch[4],
				wind: weatherMatch[5],
				aqi: weatherMatch[6],
				summary: weatherMatch[7]
			};
			textForDisplay = textForDisplay.replace(weatherRegex, "");
			const weatherCard = document.createElement("div");
			weatherCard.className = "weather-card";
			weatherCard.innerHTML = `
                <div class="weather-header">
                    <div class="weather-loc">${weatherData.location}</div>
                    <div class="weather-cond">${weatherData.condition}</div>
                </div>
                <div class="weather-main">
                    <div class="weather-temp">${weatherData.temp}</div>
                </div>
                <div class="weather-grid">
                    <div class="weather-item"><span>Humidity</span><strong>${weatherData.humidity}</strong></div>
                    <div class="weather-item"><span>Wind</span><strong>${weatherData.wind}</strong></div>
                    <div class="weather-item"><span>AQI</span><strong>${weatherData.aqi}</strong></div>
                </div>
                <div class="weather-summary">${weatherData.summary}</div>
            `;
			contentElement.appendChild(weatherCard);
		} else if (newsMatch) {
			const rawNews = newsMatch[1];
			textForDisplay = textForDisplay.replace(newsRegex, "");
			const newsItems = rawNews
				.split(";")
				.map((item) => {
					const parts = item.split("|");
					return {
						title: parts[0]?.trim(),
						source: parts[1]?.trim(),
						link: parts[2]?.trim()
					};
				})
				.filter((n) => n.title);
			const newsContainer = document.createElement("div");
			newsContainer.className = "news-container";
			newsItems.forEach((item) => {
				const card = document.createElement("a");
				card.className = "news-card";
				card.href = item.link;
				card.target = "_blank";
				card.innerHTML = `
                    <span class="news-title">${item.title}</span>
                    <div class="news-meta">
                        <span class="news-source">${item.source}</span>
                        <span class="news-time">Read more &rarr;</span>
                    </div>
                `;
				newsContainer.appendChild(card);
			});
			contentElement.appendChild(newsContainer);
		} else if (studyMatch) {
			textForDisplay = textForDisplay.replace(studyTriggerRegex, "");
			try {
				studyQuestions = JSON.parse(studyMatch[1]);
				studyFormId = `study-form-${Date.now()}`;
				const studyContainer = document.createElement("div");
				studyContainer.id = studyFormId;
				contentElement.appendChild(studyContainer);
			} catch (e) {}
		} else if (studyEndMatch) {
			textForDisplay = textForDisplay.replace(studyEndRegex, "");
			setTimeout(() => exitStudyMode(), 2000);
		}

		contentElement.innerHTML += formatAIResponse(textForDisplay);
		if (sources && sources.length > 0) {
			const sourcesElement = document.createElement("div");
			sourcesElement.className = "sources";
			sourcesElement.innerHTML = "<strong>Sources:</strong>";
			const sourceList = document.createElement("ul");
			sources.forEach((source) => {
				const listItem = document.createElement("li");
				listItem.innerText =
					source.publication || source.title || source.uri || "Unknown Source";
				if (source.uri) {
					const link = document.createElement("a");
					link.href = source.uri;
					link.innerText = " (Link)";
					link.target = "_blank";
					listItem.appendChild(link);
				}
				sourceList.appendChild(listItem);
			});
			sourcesElement.appendChild(sourceList);
			message.appendChild(sourcesElement);
		}
	} else {
		contentElement.innerText = content;
		if (fileInfo) {
			const fileInfoElement = document.createElement("span");
			fileInfoElement.className = "file-info";
			fileInfoElement.innerText = ` ${fileInfo}`;
			contentElement.appendChild(fileInfoElement);
		}
	}
	const timestampElement = document.createElement("span");
	timestampElement.className = "timestamp";
	timestampElement.innerText = new Date(timestamp).toLocaleString();
	const actionsDiv = document.createElement("div");
	actionsDiv.className = "message-actions";
	message.appendChild(contentElement);
	if (sender === "bot" && message.querySelector(".sources")) {
		message.insertBefore(timestampElement, message.querySelector(".sources"));
	} else {
		message.appendChild(timestampElement);
	}
	message.appendChild(actionsDiv);
	if (sender === "user") {
		const editBtn = document.createElement("button");
		editBtn.className = "edit-msg-btn";
		editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Edit`;
		editBtn.onclick = () => handleEditMessage(timestamp);
		actionsDiv.appendChild(editBtn);
	}
	chatBox.appendChild(message);
	chatBox.scrollTop = chatBox.scrollHeight;
	if (sender === "bot" && !message.classList.contains("status")) {
		addCopyButtonsToCodeBlocks(message);
		addDownloadButtonListeners(message);
		addRewriteButton(message);
		if (window.MathJax && window.MathJax.typesetPromise) {
			window.MathJax.typesetPromise([message]).catch((err) => {});
		}
	}
	if (jsCode && rendererId) {
		renderThreeJSModel(jsCode, rendererId);
	}
	if (musicPrompt && musicContainerId) {
		generateAndRenderMusicInChat(musicPrompt, musicContainerId);
	}
	if (spotifyQuery && spotifyContainerId) {
		renderSpotifyEmbed(spotifyQuery, spotifyContainerId);
	}
	if (mapsData && mapsContainerId) {
		renderMapsRoute(
			mapsData.origin,
			mapsData.destination,
			mapsData.waypoints,
			mapsData.mode,
			mapsContainerId
		);
	}
	if (studyFormId && studyQuestions) {
		renderStudyForm(studyQuestions, studyFormId);
	}

	if (postRenderTasks.length > 0) {
		postRenderTasks.forEach((task) => {
			if (task.type === "geometry") {
				renderGeometry(task.code, task.id);
			}
		});
	}

	return message;
}

async function processFilesForAPI(files) {
	const fileParts = [];
	for (const file of files) {
		const mimeType = file.type || "application/octet-stream";
		const filePart = await new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (event) => {
				const base64Data = event.target.result.split(",")[1];
				resolve({ inline_data: { mime_type: mimeType, data: base64Data } });
			};
			reader.onerror = () => {
				reject(new Error(`Failed to read file: ${file.name}`));
			};
			reader.readAsDataURL(file);
		});
		if (filePart) {
			fileParts.push(filePart);
		}
	}
	return fileParts;
}

function generateChatName(history) {
	if (!history || history.length < 2) {
		return "New Chat";
	}
	const firstUserMessage = history.find((msg) => {
		if (msg.role !== "user" || !msg.parts || msg.parts.length === 0) return false;
		const textPart = msg.parts.find((p) => p.text);
		if (!textPart) return false;
		const text = textPart.text.trim();
		if (
			text.startsWith("SYSTEM:") ||
			text.startsWith("SYSTEM_OUTPUT:") ||
			text.includes("User has completed the Study Mode") ||
			text.startsWith("You are **Beweble**")
		) {
			return false;
		}
		return text.length > 0;
	});

	if (firstUserMessage) {
		const text = firstUserMessage.parts.find((part) => part.text).text.trim();
		const cleanText = text.replace(/[*_~`]/g, "");
		return cleanText.substring(0, 30) + (cleanText.length > 30 ? "..." : "");
	}
	return "New Chat";
}

async function triggerChatTitleGeneration(chatId) {
	const chats = JSON.parse(localStorage.getItem(CHATS_STORAGE_KEY) || "{}");
	const history = chats[chatId];
	if (!history || history.length < 2) {
		return;
	}
	const userMsg = history.find(
		(msg) =>
			msg.role === "user" &&
			msg.parts.find((p) => p.text) &&
			!msg.parts[0].text.trim().startsWith("SYSTEM:") &&
			!msg.parts[0].text.includes("User has completed the Study Mode")
	);

	const botMsg = history.find(
		(msg) =>
			msg.role === "model" &&
			msg.parts.find((p) => p.text) &&
			!msg.parts[0].text.includes("SYSTEM_OUTPUT")
	);

	const userPrompt = userMsg
		? userMsg.parts.find((p) => p.text).text.substring(0, 100)
		: "";
	const botResponse = botMsg
		? botMsg.parts.find((p) => p.text).text.substring(0, 100)
		: "";

	if (!userPrompt) return;

	const titlePrompt = `Based on this conversation:
User: "${userPrompt}..."
AI: "${botResponse}..."

What is a short, concise title for this chat (max 5 words)? Respond with ONLY the title text.`;
	try {
		const data = await fetchWithRetry(
			GEMINI_API_ENDPOINT,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents: [{ role: "user", parts: [{ text: titlePrompt }] }]
				})
			},
			500
		);
		const titleText = data.candidates?.[0]?.content?.parts?.[0]?.text
			?.trim()
			.replace(/"/g, "");
		if (!titleText) return;
		renameChat(chatId, titleText);
		loadChatsList();
	} catch (error) {}
}

function renameChat(chatId, newName) {
	let chatListMeta = JSON.parse(
		localStorage.getItem(CHATS_STORAGE_KEY + "_meta") || "[]"
	);
	const metaIndex = chatListMeta.findIndex((m) => m.id === chatId);
	if (metaIndex !== -1) {
		chatListMeta[metaIndex].name = newName;
		localStorage.setItem(
			CHATS_STORAGE_KEY + "_meta",
			JSON.stringify(chatListMeta)
		);
	}
}

function loadChatsList() {
	const chatsMeta = JSON.parse(
		localStorage.getItem(CHATS_STORAGE_KEY + "_meta") || "[]"
	);
	chatList.innerHTML = "";
	if (chatsMeta.length === 0) {
		chatList.innerHTML = "<p class='no-history'>No saved chats yet.</p>";
		return;
	}
	chatsMeta.forEach((meta) => {
		const listItem = document.createElement("li");
		listItem.className = "chat-item";
		listItem.dataset.chatId = meta.id;
		listItem.innerHTML = `
    <div>
        <span class="chat-name">${escapeHTML(meta.name)}</span>
        <input type="text" class="rename-input" style="display: none;" value="${escapeHTML(
									meta.name
								)}">
    </div>
    <div class="chat-actions">
        <button class="edit-chat-btn" title="Rename chat">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
        </button>
        <button class="delete-chat-btn" title="Delete chat">
            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18" height="18" viewBox="0 0 24 24">
                <path d="M3 3H21V5H3z"></path>
                <path d="M16.1,22H7.9c-1,0-1.9-0.7-2-1.7L4,4.1l2-0.2L7.9,20l8.2,0L18,3.9l2,0.2l-1.9,16.1C18,21.3,17.1,22,16.1,22z"></path>
                <path d="M5,4l1.9,16.1c0.1,0.5,0.5,0.9,1,0.9h8.2 c0.5,0,0.9-0.4,1-0.9L19,4H5z"></path>
                <path d="M15 3L15 4 9 4 9 3 10 2 14 2z"></path>
            </svg>
        </button>
    </div>
`;
		const chatNameSpan = listItem.querySelector(".chat-name");
		const renameInput = listItem.querySelector(".rename-input");
		const editBtn = listItem.querySelector(".edit-chat-btn");
		const deleteBtn = listItem.querySelector(".delete-chat-btn");
		chatNameSpan.addEventListener("click", () => {
			loadChat(meta.id);
		});
		editBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			chatNameSpan.style.display = "none";
			editBtn.style.display = "none";
			deleteBtn.style.display = "none";
			renameInput.style.display = "inline-block";
			renameInput.focus();
			renameInput.select();
		});
		const saveRename = () => {
			const newName = renameInput.value.trim();
			if (newName && newName !== meta.name) {
				renameChat(meta.id, newName);
				chatNameSpan.innerText = newName;
			} else {
				renameInput.value = meta.name;
			}
			chatNameSpan.style.display = "inline-block";
			editBtn.style.display = "inline-block";
			deleteBtn.style.display = "inline-block";
			renameInput.style.display = "none";
		};
		renameInput.addEventListener("blur", saveRename);
		renameInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				saveRename();
			} else if (e.key === "Escape") {
				renameInput.value = meta.name;
				chatNameSpan.style.display = "inline-block";
				editBtn.style.display = "inline-block";
				deleteBtn.style.display = "inline-block";
				renameInput.style.display = "none";
			}
		});
		deleteBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			if (confirm(`Are you sure you want to delete chat "${meta.name}"?`)) {
				deleteChat(meta.id);
			}
		});
		chatList.appendChild(listItem);
	});
}

function saveChat() {
	if (conversationHistory.length === 0) {
		return;
	}
	let chats = JSON.parse(localStorage.getItem(CHATS_STORAGE_KEY) || "{}");
	let chatListMeta = JSON.parse(
		localStorage.getItem(CHATS_STORAGE_KEY + "_meta") || "[]"
	);
	if (!currentChatId) {
		currentChatId = Date.now().toString();
		const chatName = generateChatName(conversationHistory);
		chatListMeta.unshift({
			id: currentChatId,
			name: chatName,
			timestamp: new Date().toISOString()
		});
	} else {
		const chatMetaIndex = chatListMeta.findIndex(
			(chat) => chat.id === currentChatId
		);
		if (chatMetaIndex !== -1) {
			if (
				chatListMeta[chatMetaIndex].name === "New Chat" ||
				chatListMeta[chatMetaIndex].name.startsWith(
					conversationHistory[0]?.parts[0]?.text.substring(0, 30)
				)
			) {
				chatListMeta[chatMetaIndex].name = generateChatName(conversationHistory);
			}
			chatListMeta[chatMetaIndex].timestamp = new Date().toISOString();
			const updatedChatMeta = chatListMeta.splice(chatMetaIndex, 1)[0];
			chatListMeta.unshift(updatedChatMeta);
		} else {
			const chatName = generateChatName(conversationHistory);
			chatListMeta.unshift({
				id: currentChatId,
				name: chatName,
				timestamp: new Date().toISOString()
			});
		}
	}
	chats[currentChatId] = conversationHistory;
	localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
	localStorage.setItem(
		CHATS_STORAGE_KEY + "_meta",
		JSON.stringify(chatListMeta)
	);
	loadChatsList();
}

function loadChat(chatId) {
	const chats = JSON.parse(localStorage.getItem(CHATS_STORAGE_KEY) || "{}");
	const chatToLoad = chats[chatId];
	if (!chatToLoad) {
		return;
	}
	chatBox.innerHTML = "";
	conversationHistory = chatToLoad;
	currentChatId = chatId;
	isWaitingForToolExecution = false;
	lastUserMessageText = "";
	removeStatusMessage();

	let studyActive = false;
	for (let i = conversationHistory.length - 1; i >= 0; i--) {
		let p = conversationHistory[i].parts.map((x) => x.text || "").join("");
		if (p.includes("![Beweble_STUDY_END]")) {
			studyActive = false;
			break;
		}
		if (p.includes("User has completed the Study Mode")) {
			studyActive = true;
			break;
		}
	}

	if (studyActive) {
		showStudyResumeModal();
	} else {
		isStudyMode = false;
		document.body.classList.remove("study-mode");
		stopStudyTimer();
	}

	conversationHistory.forEach((message) => {
		const textContent = message.parts.find((part) => part.text)?.text || "";
		if (
			message.role === "user" &&
			textContent.trim().startsWith("You are **Beweble**")
		) {
			return;
		}
		if (message.role === "user" && textContent.trim().startsWith("SYSTEM:")) {
			return;
		}
		if (
			message.role === "user" &&
			textContent.trim().startsWith("SYSTEM_OUTPUT:")
		) {
			return;
		}
		if (
			message.role === "user" &&
			textContent.includes("User has completed the Study Mode")
		) {
			return;
		}

		const toolCodePart = message.parts?.find((part) => part.tool_code);
		if (toolCodePart) {
			let toolMessageContent = `(Model requested tool use)`;
			try {
				const parsedToolCode = JSON.parse(
					toolCodePart.tool_code.replace("print(", "").replace(")", "")
				);
				if (
					parsedToolCode &&
					parsedToolCode.googleSearch &&
					parsedToolCode.googleSearch.queries &&
					parsedToolCode.googleSearch.queries.length > 0
				) {
					toolMessageContent = `(Search requested: "${parsedToolCode.googleSearch.queries.join(
						", "
					)}")`;
				}
			} catch (e) {
				toolMessageContent = `(Model requested tool use - parse error)`;
			}
			if (!isStudyMode) {
				addMessage(toolMessageContent, "bot", message.timestamp);
			}
			return;
		}
		const toolResultPart = message.parts?.find((part) => part.tool_result);
		if (toolResultPart) {
			if (!isStudyMode) {
				addMessage("(Search results processed by model)", "bot", message.timestamp);
			}
			return;
		}
		const hasFilePart = message.parts.some((part) => part.inline_data);
		const fileInfo = hasFilePart
			? `[${
					message.parts.filter((part) => part.inline_data).length
			  } file(s) attached]`
			: null;
		const sources = message.citationMetadata?.citationSources || null;
		if (message.role === "user" && textContent) {
			lastUserMessageText = textContent;
			addMessage(
				textContent,
				message.role,
				message.timestamp || new Date(),
				fileInfo
			);
		} else if (message.role === "model" && textContent) {
			addMessage(
				textContent,
				"bot",
				message.timestamp || new Date(),
				null,
				sources
			);
		} else if (textContent || fileInfo) {
			addMessage(
				textContent,
				message.role,
				message.timestamp || new Date(),
				fileInfo
			);
		}
	});
	chatBox.querySelectorAll(".message.bot:not(.status)").forEach((botMsgEl) => {
		if (!botMsgEl.querySelector(".copy-code-btn"))
			addCopyButtonsToCodeBlocks(botMsgEl);
		if (!botMsgEl.querySelector(".download-btn[data-listener-attached]"))
			addDownloadButtonListeners(botMsgEl);
		if (!botMsgEl.querySelector(".rewrite-btn")) addRewriteButton(botMsgEl);
		if (window.MathJax && window.MathJax.typesetPromise) {
			window.MathJax.typesetPromise([botMsgEl]).catch((err) => {});
		}
	});
	historyPanel.classList.remove("visible");
	chatBox.scrollTop = chatBox.scrollHeight;
}

function deleteChat(chatId) {
	let chats = JSON.parse(localStorage.getItem(CHATS_STORAGE_KEY) || "{}");
	let chatsMeta = JSON.parse(
		localStorage.getItem(CHATS_STORAGE_KEY + "_meta") || "[]"
	);
	delete chats[chatId];
	chatsMeta = chatsMeta.filter((meta) => meta.id !== chatId);
	localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
	localStorage.setItem(CHATS_STORAGE_KEY + "_meta", JSON.stringify(chatsMeta));
	loadChatsList();
	if (currentChatId === chatId) {
		currentChatId = null;
		conversationHistory = [];
		chatBox.innerHTML = "";
		addMessage("Chat deleted. Starting a new chat.", "bot", new Date());
	}
}

function clearChatHistory() {
	localStorage.removeItem(CHATS_STORAGE_KEY);
	localStorage.removeItem(CHATS_STORAGE_KEY + "_meta");
	conversationHistory = [];
	currentChatId = null;
	chatBox.innerHTML = "";
	loadChatsList();
	isWaitingForToolExecution = false;
	lastUserMessageText = "";
	removeStatusMessage();
	addMessage("Chat history cleared. Starting a new chat.", "bot", new Date());
}

async function executeAndSendToolResults(toolCode) {
	let queries = [];
	try {
		const parsedToolCode = JSON.parse(
			toolCode.replace("print(", "").replace(")", "")
		);
		if (
			parsedToolCode &&
			parsedToolCode.googleSearch &&
			parsedToolCode.googleSearch.queries
		) {
			queries = parsedToolCode.googleSearch.queries;
		}
	} catch (e) {
		removeStatusMessage();
		addMessage(
			"Error: Could not understand search request from model.",
			"bot",
			new Date()
		);
		isWaitingForToolExecution = false;
		updateButtonState("send");
		saveChat();
		return;
	}
	updateStatusMessage("Generating Response...");
	const toolResultPart = {
		tool_result: {
			content: mockSearchResults
		}
	};
	conversationHistory.push({
		role: "tool",
		timestamp: new Date().toISOString(),
		parts: [toolResultPart]
	});
	removeStatusMessage();
	updateStatusMessage("Generating final response...");
	await continueChatWithContext();
}

async function continueChatWithContext() {
	const memory = getMemory();
	const memoryString =
		memory.length > 0
			? `\n\nCURRENT PERSISTENT MEMORY[You know these facts across all chats]:\n${memory
					.map((m) => `- ${m.content} (ID: ${m.id})`)
					.join("\n")}\n`
			: "\n\nCURRENT PERSISTENT MEMORY: Empty.\n";

	const apiContents = conversationHistory
		.map((msg) => ({
			role: msg.role,
			parts: msg.parts
		}))
		.filter((msg) => msg.parts && msg.parts.length > 0);

	const requestBody = {
		contents: apiContents,
		tools: [
			{
				googleSearch: {}
			}
		],
		systemInstruction: {
			parts: [
				{
					text: SYSTEM_INSTRUCTION_TEXT + memoryString
				}
			]
		}
	};

	try {
		const data = await fetchWithRetry(
			GEMINI_API_ENDPOINT,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestBody),
				signal: currentAbortController ? currentAbortController.signal : null
			},
			500
		);
		removeStatusMessage();
		handleApiResponse(data, null);
	} catch (error) {
		if (error.name === "AbortError") return;
		removeStatusMessage();
		addMessage(
			`Error processing conversation: ${error.message}`,
			"bot",
			new Date()
		);
		saveChat();
		isWaitingForToolExecution = false;
		updateButtonState("send");
	}
}

function testRender(code, type) {
	const dummyContainer = document.createElement("div");
	dummyContainer.style.width = "500px";
	dummyContainer.style.height = "500px";
	dummyContainer.style.position = "absolute";
	dummyContainer.style.top = "-9999px";
	dummyContainer.style.visibility = "hidden";
	document.body.appendChild(dummyContainer);

	let consoleLogs = [];
	const originalError = console.error;
	const originalWarn = console.warn;
	console.error = function (...args) {
		consoleLogs.push(args.join(" "));
		originalError.apply(console, args);
	};
	console.warn = function (...args) {
		consoleLogs.push("WARN: " + args.join(" "));
		originalWarn.apply(console, args);
	};

	try {
		if (type === "three") {
			if (typeof THREE === "undefined") throw new Error("THREE.js not loaded");
			const F = new Function(
				"THREE",
				"OrbitControls",
				"RGBELoader",
				"container",
				code
			);
			F(THREE, OrbitControls, RGBELoader, dummyContainer);
		} else if (type === "d3") {
			if (typeof window.d3 === "undefined") throw new Error("d3.js not loaded");
			const F = new Function("d3", "container", code);
			F(window.d3, dummyContainer);
		}
		if (consoleLogs.length > 0) {
			throw new Error(
				"Console errors during execution: " + consoleLogs.join(" | ")
			);
		}
		document.body.removeChild(dummyContainer);
		console.error = originalError;
		console.warn = originalWarn;
		return { success: true };
	} catch (e) {
		if (document.body.contains(dummyContainer)) {
			document.body.removeChild(dummyContainer);
		}
		console.error = originalError;
		console.warn = originalWarn;
		return { success: false, error: e.message };
	}
}

async function handleApiResponse(data, typingMessage) {
	if (typingMessage) {
		removeStatusMessage();
	} else if (currentStatusMessageElement) {
		removeStatusMessage();
	}
	if (data.error) {
		addMessage(
			`API Error: ${data.error.message || "Unknown error"}`,
			"bot",
			new Date()
		);
		isWaitingForToolExecution = false;
		currentAbortController = null;
		updateButtonState("send");
		saveChat();
		return;
	}

	const toolCodePart = data.candidates?.[0]?.content?.parts?.find(
		(part) => part.tool_code
	);
	const botReplyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

	const pythonRegex = /!\[Beweble_python:\s*(?:```python\n?)?([\s\S]*?)(?:```\n?)?\s*\]!/;
	const pythonMatch = botReplyText ? botReplyText.match(pythonRegex) : null;

	if (pythonMatch && pythonRetryCount < MAX_PYTHON_RETRIES) {
		const pythonCode = pythonMatch[1];
		const botMessage = {
			role: "model",
			timestamp: new Date().toISOString(),
			parts: [{ text: botReplyText }]
		};
		conversationHistory.push(botMessage);
		addMessage(botReplyText, "bot", botMessage.timestamp);

		updateStatusMessage(
			`Beweble is running code (Attempt ${pythonRetryCount + 1})...`
		);
		isWaitingForToolExecution = true;
		if (!currentAbortController) currentAbortController = new AbortController();
		updateButtonState("stop");
		const executionResult = await executePythonAndCapture(pythonCode);
		let systemFeedback = "";
		if (executionResult.success) {
			systemFeedback = `SYSTEM_OUTPUT: The code executed successfully.\nStandard Output:\n${
				executionResult.output
			}\n\nStandard Error:\n${
				executionResult.error || ""
			}\n\nAnalyze this output. If it answers the user's question, provide the final answer text in your next response WITHOUT any Python tags. If the output is incorrect or empty, or there was an error in logic, rewrite the code and try again.`;
		} else {
			systemFeedback = `SYSTEM_OUTPUT: Execution Failed.\nError Message: ${executionResult.output}\n\nPlease fix the code and try again.`;
		}
		conversationHistory.push({
			role: "user",
			timestamp: new Date().toISOString(),
			parts: [{ text: systemFeedback }]
		});
		pythonRetryCount++;
		await continueChatWithContext();
		return;
	} else if (pythonMatch && pythonRetryCount >= MAX_PYTHON_RETRIES) {
		pythonRetryCount = 0;
		addMessage(
			"I tried to solve this with code multiple times but couldn't reach a stable solution. Here is the last attempt:",
			"bot"
		);
	} else {
		pythonRetryCount = 0;
	}

	let jsCodeToCheck = null;
	let jsType = null;

	const threeJsRegex = /!\[three_js_model:\s*```javascript([\s\S]*?)```\s*\]!/;
	const threeMatch = botReplyText ? botReplyText.match(threeJsRegex) : null;
	if (threeMatch) {
		jsCodeToCheck = threeMatch[1];
		jsType = "three";
	}
	const geoMatch = botReplyText
		? /!\[Beweble_geometry:\s*```javascript([\s\S]*?)```\s*\]!/.exec(botReplyText)
		: null;
	if (!jsCodeToCheck && geoMatch) {
		jsCodeToCheck = geoMatch[1];
		jsType = "d3";
	}

	if (jsCodeToCheck && jsRetryCount < MAX_JS_RETRIES) {
		updateStatusMessage(
			`Validating visualization code (Attempt ${jsRetryCount + 1})...`
		);
		const testResult = testRender(jsCodeToCheck, jsType);
		if (!testResult.success) {
			conversationHistory.push({
				role: "model",
				parts: [{ text: botReplyText }]
			});
			const feedback = `SYSTEM_OUTPUT: The ${
				jsType === "three" ? "Three.js" : "D3.js"
			} code you provided threw a runtime error during validation: "${
				testResult.error
			}". Please fix the code and regenerate the response with the corrected tag.`;
			conversationHistory.push({
				role: "user",
				parts: [{ text: feedback }]
			});
			jsRetryCount++;
			await continueChatWithContext();
			return;
		}
	}

	if (jsCodeToCheck) {
		jsRetryCount = 0;
	}

	if (toolCodePart) {
		const toolCode = toolCodePart.tool_code;
		conversationHistory.push({
			role: "model",
			timestamp: new Date().toISOString(),
			parts: [{ tool_code: toolCode }]
		});
		let toolMessageContent = `Thinking... (Model requested tool use)`;
		try {
			const parsedToolCode = JSON.parse(
				toolCode.replace("print(", "").replace(")", "")
			);
			if (
				parsedToolCode &&
				parsedToolCode.googleSearch &&
				parsedToolCode.googleSearch.queries &&
				parsedToolCode.googleSearch.queries.length > 0
			) {
				toolMessageContent = `Thinking... (Searching for: "${parsedToolCode.googleSearch.queries.join(
					", "
				)}")`;
			}
		} catch (e) {
			toolMessageContent = `Thinking... (Model requested tool use - parse error)`;
		}
		updateStatusMessage(toolMessageContent);
		isWaitingForToolExecution = true;
		if (!currentAbortController) currentAbortController = new AbortController();
		updateButtonState("stop");
		executeAndSendToolResults(toolCode).catch((toolError) => {
			if (toolError.name === "AbortError") return;
			removeStatusMessage();
			addMessage(
				`An error occurred during the search process: ${toolError.message}`,
				"bot",
				new Date()
			);
			saveChat();
			isWaitingForToolExecution = false;
			updateButtonState("send");
		});
	} else {
		const finishReason = data.candidates?.[0]?.finishReason;
		const blockReason = data.promptFeedback?.blockReason;
		const citationMetadata =
			data.candidates?.[0]?.citationMetadata?.citationSources;
		if (finishReason === "SAFETY" || blockReason) {
			let blockMessage = "My response was blocked due to safety concerns.";
			if (blockReason) blockMessage += ` Reason: ${blockReason}`;
			addMessage(blockMessage, "bot", new Date());
		} else if (botReplyText) {
			emptyResponseRetryCount = 0;
			const isNewChat = !currentChatId;
			let finalText = botReplyText;

			const memorySaveRegex = /!\[MEMORY_SAVE:\s*(.*?)\s*\]/g;
			let saveMatch;
			while ((saveMatch = memorySaveRegex.exec(finalText)) !== null) {
				const contentToSave = saveMatch[1].trim();
				if (contentToSave) {
					saveMemory(contentToSave);
				}
			}
			finalText = finalText.replace(memorySaveRegex, "");

			const memoryDeleteRegex = /!\[MEMORY_DELETE:\s*(.*?)\s*\]/g;
			let deleteMatch;
			while ((deleteMatch = memoryDeleteRegex.exec(finalText)) !== null) {
				const contentToDelete = deleteMatch[1].trim();
				if (contentToDelete) {
					deleteMemoryByContent(contentToDelete);
				}
			}
			finalText = finalText.replace(memoryDeleteRegex, "");

			const botMessage = {
				role: "model",
				timestamp: new Date().toISOString(),
				parts: [{ text: finalText }]
			};
			if (citationMetadata && citationMetadata.length > 0) {
				botMessage.citationMetadata = { citationSources: citationMetadata };
			}
			conversationHistory.push(botMessage);
			const messageElement = addMessage(
				finalText,
				"bot",
				botMessage.timestamp,
				null,
				citationMetadata
			);
			saveChat();
			if (isNewChat && conversationHistory.length === 2) {
				triggerChatTitleGeneration(currentChatId);
			}
			const imageTriggerRegex = /!\[pollinations_image:\s*(.*?)\s*\]/;
			const musicRegex = /!\[beweble_music:\s*(.*?)\s*\]/;
			const spotifyRegex = /!\[spotify:\s*(.*?)\s*\]/;
			const mapsRegex = /!\[maps_route:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\]/;
			const weatherRegex = /!\[beweble_weather:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\]/;
			const newsRegex = /!\[beweble_news:\s*(.*?)\s*\]/;
			const studyRegex = /!\[beweble_STUDY_INIT:\s*(\[.*?\])\s*\]/;
			const studyEndRegex = /!\[beweble_STUDY_END\]/;
			const geometryRegex = /!\[beweble_geometry:\s*```javascript([\s\S]*?)```\s*\]!/g;
			const gifRegex = /!\[beweble_gif:\s*(.*?)\s*\]/;
			const youtubeRegex = /!\[bewwble_youtube:\s*(.*?)\s*\]/;
			const realImageRegex = /!\[beweble_image:\s*(.*?)\s*\]/;
			const screenshotRegex = /!\[beweble_screenshot:\s*(.*?)\s*\]/;
			const mcqRegexTest = /!\[beweble_mcq:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(\d+)\s*\]/;

			if (
				!finalText.match(imageTriggerRegex) &&
				!finalText.match(musicRegex) &&
				!finalText.match(spotifyRegex) &&
				!finalText.match(mapsRegex) &&
				!finalText.match(weatherRegex) &&
				!finalText.match(newsRegex) &&
				!finalText.match(studyRegex) &&
				!finalText.match(studyEndRegex) &&
				!finalText.match(geometryRegex) &&
				!finalText.match(gifRegex) &&
				!finalText.match(youtubeRegex) &&
				!finalText.match(realImageRegex) &&
				!finalText.match(screenshotRegex) &&
				!finalText.match(mcqRegexTest) &&
				!isStudyMode
			) {
				attachCrossQuestions(lastUserMessageText, finalText, messageElement);
			}
		} else {
			if (emptyResponseRetryCount < MAX_EMPTY_RESPONSE_RETRIES) {
				emptyResponseRetryCount++;
				updateStatusMessage(
					`Retrying generation (Attempt ${emptyResponseRetryCount})...`
				);
				await new Promise((r) => setTimeout(r, 1000));
				await continueChatWithContext();
				return;
			}
			emptyResponseRetryCount = 0;
			addMessage(
				"Received an unexpected response from the API. Please try again or rephrase.",
				"bot",
				new Date()
			);
			saveChat();
		}
		isWaitingForToolExecution = false;
		currentAbortController = null;
		updateButtonState("send");
	}
}

async function getUserLocation() {
	return new Promise((resolve, reject) => {
		if ("geolocation" in navigator) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					resolve({
						latitude: position.coords.latitude,
						longitude: position.coords.longitude
					});
				},
				(error) => {
					reject(error);
				}
			);
		} else {
			reject(new Error("Geolocation is not supported by this browser."));
		}
	});
}

function stopGeneration() {
	if (currentAbortController) {
		currentAbortController.abort();
		currentAbortController = null;
	}
	if (
		conversationHistory.length > 0 &&
		conversationHistory[conversationHistory.length - 1].role === "user"
	) {
		conversationHistory.pop();
	}
	isWaitingForToolExecution = false;
	isProcessing = false;
	removeStatusMessage();
	updateButtonState("send");
}

async function sendMessage() {
	if (isProcessing || isWaitingForToolExecution) {
		return;
	}
	isProcessing = true;
	const text = userInput.innerText.trim();
	const filesToProcess = selectedFiles;
	if (!text && filesToProcess.length === 0) {
		userInput.innerHTML = "";
		resizeInputArea();
		isProcessing = false;
		return;
	}
	if (conversationHistory.length === 0) {
		currentChatId = null;
	}
	const userMessageParts = [];
	if (text) {
		userMessageParts.push({ text: text });
		lastUserMessageText = text;
	}
	try {
		const location = await getUserLocation();
		const locationText = `SYSTEM: User's current location is Latitude: ${location.latitude}, Longitude: ${location.longitude}.`;
		userMessageParts.push({ text: locationText });
	} catch (error) {}
	let fileInfoForDisplay = null;
	if (filesToProcess.length > 0) {
		fileInfoForDisplay = `[${filesToProcess.length} file(s) attached]`;
		try {
			const fileParts = await processFilesForAPI(filesToProcess);
			fileParts.forEach((part) => {
				if (part) userMessageParts.push(part);
			});
		} catch (error) {
			addMessage(`Error processing files: ${error.message}`, "bot", new Date());
			clearSelectedFiles();
			isProcessing = false;
			return;
		}
	}
	if (userMessageParts.length === 0) {
		addMessage(
			"No valid content to send after processing files or empty text input.",
			"bot",
			new Date()
		);
		clearSelectedFiles();
		isProcessing = false;
		return;
	}
	const userMessage = {
		role: "user",
		timestamp: new Date().toISOString(),
		parts: userMessageParts
	};
	conversationHistory.push(userMessage);
	addMessage(text, "user", userMessage.timestamp, fileInfoForDisplay);
	userInput.innerHTML = "";
	resizeInputArea();
	clearSelectedFiles();
	updateStatusMessage("Planning strategy...");
	currentAbortController = new AbortController();
	updateButtonState("stop");

	if (isStudyMode) {
		updateStatusMessage("Thinking (Study Mode)...");
		await continueChatWithContext();
		isProcessing = false;
		return;
	}

	const prompt = `Classify the nature of this query. Return ONLY the number:
1 = Simple chat (e.g., "Hi", "Joke", "Summary").
2 = Deep Reasoning required (e.g., "Explain Quantum Mechanics", "Write a story", "Analyze this code").
3 = High-Stakes Logic/Math (e.g., "Complex calculus", "Logic puzzle", "Proof").

Query: "${text}"`;

	try {
		const decisionResp = await fetchWithRetry(
			GEMINI_API_ENDPOINT,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents: [{ role: "user", parts: [{ text: prompt }] }]
				})
			},
			500
		);
		const decisionText =
			decisionResp?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "1";
		const levelMatch = decisionText.match(/\d+/);
		let level = levelMatch ? parseInt(levelMatch[0]) : 1;

		if (level === 3) {
			await retryUntilConsensus(userMessageParts, 3);
			isProcessing = false;
			updateButtonState("send");
		} else if (level === 2) {
			await runHeadlessSolver(userMessageParts, 0, "Deep Reasoning");
			isProcessing = false;
			updateButtonState("send");
		} else {
			await continueChatWithContext();
			isProcessing = false;
		}
	} catch (e) {
		await continueChatWithContext();
		isProcessing = false;
	}
}

function enhancePrompt(prompt) {
	return `The user asked: "${prompt}".\nRewrite this into a clear, detailed, and specific instruction that ensures elaboration, structure, examples, and depth.\nThen, use this enhanced version as the actual query.\n`;
}

async function generateCrossQuestions(originalPrompt, aiResponse) {
	const requestBody = {
		contents: [
			{
				role: "user",
				parts: [
					{
						text: `The user originally asked: "${originalPrompt}".\nYou responded with: "${aiResponse}".\nNow, predict 3 to 5 follow-up questions the user is most likely to ask next.\nOnly return the questions as a simple list, nothing else.\n`
					}
				]
			}
		]
	};
	try {
		const data = await fetchWithRetry(
			GEMINI_API_ENDPOINT,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestBody)
			},
			500
		);
		const suggestionsText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
		return suggestionsText
			.split("\n")
			.map((q) => q.replace(/^\d+\.\s*/, "").trim())
			.filter((q) => q.length > 0);
	} catch (err) {
		return [];
	}
}

async function attachCrossQuestions(
	originalPrompt,
	aiResponse,
	containerElement
) {
	const statusDiv = document.createElement("div");
	statusDiv.className = "suggestions-status";
	statusDiv.innerText = "Generating suggestions...";
	containerElement.appendChild(statusDiv);
	const crossQs = await generateCrossQuestions(originalPrompt, aiResponse);
	if (crossQs.length > 0) {
		const qContainer = document.createElement("div");
		qContainer.className = "cross-questions";
		qContainer.innerHTML =
			"<strong>You might also ask:</strong><br>" +
			crossQs.map((q) => `<button class="cross-q">${q}</button>`).join(" ");
		containerElement.removeChild(statusDiv);
		containerElement.appendChild(qContainer);
		qContainer.querySelectorAll(".cross-q").forEach((btn) => {
			btn.addEventListener("click", () => {
				userInput.innerText = btn.innerText;
				resizeInputArea();
				userInput.focus();
			});
		});
	} else {
		if (containerElement.contains(statusDiv)) {
			containerElement.removeChild(statusDiv);
		}
	}
}

async function runConsensusArbiter(solutions, originalParts) {
	const solutionsText = solutions
		.map((s, i) => `[Expert ${i + 1} Output]:\n${s}`)
		.join("\n\n");
	const prompt = `You are the Chief Arbiter.\nThree expert solvers have provided answers to the user's request.\n${solutionsText}\n\nYour Task:\n1. Compare the solutions. Look for agreement.\n2. If any solver successfully used Python code execution to verify a result, PRIORITIZE that evidence over pure reasoning.\n3. Synthesize the single best, most accurate answer.\n4. Output ONLY the final answer to the user. Do not explain the voting process.\n`;
	const apiContents = [
		{ role: "user", parts: [...originalParts, { text: prompt }] }
	];
	const response = await fetchWithRetry(
		GEMINI_API_ENDPOINT,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ contents: apiContents })
		},
		500
	);
	return (
		response?.candidates?.[0]?.content?.parts?.[0]?.text || "Consensus failed."
	);
}

async function runHeadlessSolver(originalParts, instanceId, personaType) {
	const personas = [
		"You are The Specialist. You have deep, specific academic knowledge. If the question is about Math, you are a Mathematician. If History, a Historian. Be precise.",
		"You are The Skeptic. You double-check facts, look for logic traps, and verify assumptions. If possible, use Python to test the answer.",
		"You are The Visionary. You look for the broader context, creative solutions, and synthesis of ideas."
	];

	let solverInstruction = "";
	if (personaType === "Deep Reasoning") {
		solverInstruction = `SYSTEM: Initiate Deep Reasoning Protocol.\n1. Before answering, output a detailed <thought> process planning your approach.\n2. If math/logic is needed, write and execute Python code.\n3. Finally, provide the Answer.`;
	} else {
		solverInstruction = `${
			personas[instanceId % 3]
		}\nSolve the user's request.\nIf it involves calculation, simulation, or data, write Python code to be certain.\nOutput your logic and your final answer.`;
	}

	const newParts = originalParts.map((p) => ({ ...p }));
	newParts.push({ text: solverInstruction });

	let internalHistory = conversationHistory.map((msg) => ({
		role: msg.role,
		parts: msg.parts
	}));

	if (
		internalHistory.length > 0 &&
		internalHistory[internalHistory.length - 1].role === "user"
	) {
		internalHistory[internalHistory.length - 1].parts = newParts;
	} else {
		internalHistory.push({ role: "user", parts: newParts });
	}

	for (let i = 0; i < 4; i++) {
		const requestBody = {
			contents: internalHistory,
			systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION_TEXT }] }
		};

		try {
			const data = await fetchWithRetry(
				GEMINI_API_ENDPOINT,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(requestBody)
				},
				500
			);

			const botReplyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
			if (!botReplyText) return "Failed to generate.";

			internalHistory.push({ role: "model", parts: [{ text: botReplyText }] });

			const pythonRegex = /!\[beweble_python:\s*(?:```python\n?)?([\s\S]*?)(?:```\n?)?\s*\]!/;
			const pythonMatch = botReplyText.match(pythonRegex);

			if (pythonMatch) {
				updateStatusMessage("Running computation...");
				const executionResult = await executePythonAndCapture(pythonMatch[1]);
				const feedback = executionResult.success
					? `SYSTEM_OUTPUT: Code Result:\n${executionResult.output}`
					: `SYSTEM_OUTPUT: Execution Error:\n${executionResult.output}`;
				internalHistory.push({ role: "user", parts: [{ text: feedback }] });
			} else {
				if (personaType === "Deep Reasoning") {
					const finalMsg = botReplyText
						.replace(/<thought>[\s\S]*?<\/thought>/g, "")
						.trim();
					const botMessage = {
						role: "model",
						timestamp: new Date().toISOString(),
						parts: [{ text: finalMsg }]
					};
					conversationHistory.push(botMessage);
					addMessage(finalMsg, "bot", botMessage.timestamp);
					saveChat();
					removeStatusMessage();
					return finalMsg;
				}
				return botReplyText;
			}
		} catch (e) {
			return "Error in solver.";
		}
	}
	return internalHistory[internalHistory.length - 1].parts[0].text;
}

async function retryUntilConsensus(originalParts, numSolvers) {
	updateStatusMessage(`Running consensus (${numSolvers} Experts)...`);

	const promises = [];
	for (let i = 0; i < numSolvers; i++) {
		promises.push(runHeadlessSolver(originalParts, i, "Consensus"));
	}

	const solutions = await Promise.all(promises);
	updateStatusMessage("Arbitrating results...");

	const finalAnswer = await runConsensusArbiter(solutions, originalParts);

	removeStatusMessage();
	const botMessage = {
		role: "model",
		timestamp: new Date().toISOString(),
		parts: [{ text: finalAnswer }]
	};
	conversationHistory.push(botMessage);
	addMessage(finalAnswer, "bot", botMessage.timestamp);
	saveChat();
}

const micBtn = document.getElementById("mic-btn");
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let recordingTimeout;
micBtn.addEventListener("click", () => {
	if (isRecording) {
		stopRecording();
	} else {
		startRecording();
	}
});

function blobToBase64(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const base64data = reader.result.split(",")[1];
			resolve(base64data);
		};
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

async function transcribeWithGemini(base64Audio, mimeType) {
	const prompt = {
		role: "user",
		parts: [
			{
				text:
					"Transcribe the spoken words in this audio. Punctuate the text correctly. Ignore all background sounds, non-speech elements, or speaker labels. Return ONLY the final, punctuated transcript."
			},
			{
				inline_data: {
					mime_type: mimeType,
					data: base64Audio
				}
			}
		]
	};
	try {
		const data = await fetchWithRetry(
			GEMINI_API_ENDPOINT,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ contents: [prompt] })
			},
			500
		);
		return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
	} catch (error) {
		throw new Error(`Failed to get transcription from AI: ${error.message}`);
	}
}

async function startRecording() {
	if (isWaitingForToolExecution) return;
	let recordingMimeType = "audio/webm";
	if (MediaRecorder.isTypeSupported("audio/mpeg")) {
		recordingMimeType = "audio/mpeg";
	} else if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
		recordingMimeType = "audio/webm;codecs=opus";
	} else if (MediaRecorder.isTypeSupported("audio/wav")) {
		recordingMimeType = "audio/wav";
	}
	const apiMimeType = recordingMimeType.split(";")[0];
	try {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		mediaRecorder = new MediaRecorder(stream, { mimeType: recordingMimeType });
		audioChunks = [];
		mediaRecorder.ondataavailable = (event) => {
			audioChunks.push(event.data);
		};
		mediaRecorder.onstart = () => {
			isRecording = true;
			micBtn.classList.add("recording");
			sendBtn.disabled = true;
			micBtn.disabled = false;
			userInput.contentEditable = "false";
			updateStatusMessage("Recording started... Click mic to stop");
		};
		mediaRecorder.onstop = async () => {
			isRecording = false;
			micBtn.classList.remove("recording");
			stream.getTracks().forEach((track) => track.stop());
			updateStatusMessage("Uploading and transcribing...");
			micBtn.disabled = true;
			const audioBlob = new Blob(audioChunks, { type: apiMimeType });
			audioChunks = [];
			try {
				const base64Audio = await blobToBase64(audioBlob);
				const correctedText = await transcribeWithGemini(base64Audio, apiMimeType);
				removeStatusMessage();
				if (correctedText) {
					userInput.innerText = correctedText;
					resizeInputArea();
					await sendMessage();
				} else {
					addMessage(
						"Speech-to-Text Error: Could not get a transcription.",
						"bot",
						new Date()
					);
				}
			} catch (error) {
				removeStatusMessage();
				addMessage(`Speech-to-Text Error: ${error.message}`, "bot", new Date());
			} finally {
				userInput.contentEditable = "true";
				sendBtn.disabled = false;
				micBtn.disabled = false;
			}
		};
		mediaRecorder.start();
	} catch (err) {
		removeStatusMessage();
		addMessage(
			`Microphone Error: Could not get microphone access. Please ensure your browser has permission.`,
			"bot",
			new Date()
		);
		userInput.contentEditable = "true";
		sendBtn.disabled = false;
		micBtn.disabled = false;
		isRecording = false;
		micBtn.classList.remove("recording");
	}
}

function stopRecording() {
	if (mediaRecorder && mediaRecorder.state === "recording") {
		mediaRecorder.stop();
		updateStatusMessage("Stopping recording. Processing...");
		micBtn.disabled = true;
	}
}

let currentSelection = {
	range: null,
	messageContentEl: null,
	originalText: "",
	placeholder: null
};

function createEnhancementModal() {
	const modalHTML = `
        <div id="enhancement-modal-overlay" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.7); display: none;
            justify-content: center; align-items: center; z-index: 10000;
        ">
            <div id="enhancement-modal" style="
                background: #282828; border-radius: 6px; padding: 15px;
                width: 90%; max-width: 400px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
                color: #f0f0f0;
                font-family: sans-serif;
            ">
               <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 1.1em; border-bottom: 1px solid #444; padding-bottom: 8px;">
                    Enhance Selection
                </h3>
                <div style="position: relative; margin-bottom: 15px;">
                    <p id="selected-text-preview" style="
                        font-size: 0.8em; 
                        padding: 8px;
                        padding-right: 30px;
                        background: #333;
                        border-radius: 3px;
                        border-left: 3px solid #6c99e0;
                        max-height: 90px; overflow-y: auto; white-space: pre-wrap;
                        margin: 0;
                    ">
                        <span style="font-style: italic;">No text selected.</span>
                    </p>
                    <button id="modal-copy-btn" title="Copy selected text" style="
                        position: absolute;
                        top: 5px;
                        right: 5px;
                        background: none;
                        border: none;
                        color: #888;
                        cursor: pointer;
                        padding: 2px;
                    ">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1h-3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                    </button>
                </div>
                <div style="margin-bottom: 10px;">
                    <label for="enhancement-prompt" style="display: block;
margin-bottom: 5px; font-weight: bold; font-size: 0.9em;">
                        What do you want enhanced?
                    </label>
                    <div id="enhancement-prompt" contentEditable="true" placeholder="Make it more formal and shorter." style="
       width: 98%; 
                        padding: 8px; 
                        border: 1px solid #6c99e0; 
                        border-radius: 3px; 
                        background: #3c3c3c;
color: #f0f0f0;
 min-height: 50px; 
                        resize: vertical;
                        font-family: inherit;
                        box-sizing: border-box; 
                        overflow-y: auto;
"></div>
                </div>
                <div style="display: flex;
justify-content: flex-end; gap: 8px; margin-top: 15px;">
                    <button id="modal-cancel-btn" style="
                        padding: 6px 12px;
background: #555; color: white;
                        border: none; border-radius: 3px; cursor: pointer;
                        font-size: 0.9em;
">
                        Cancel
                    </button>
                    <button id="modal-send-btn" style="
                        padding: 6px 12px;
background: #6c99e0; color: #000;
                        border: none; border-radius: 3px; cursor: pointer; font-weight: bold;
                        font-size: 0.9em;
">
                        Send
                    </button>
                </div>
            </div>
        </div>
    `;
	document.body.insertAdjacentHTML("beforeend", modalHTML);

	const copyBtn = document.getElementById("modal-copy-btn");
	if (copyBtn) {
		copyBtn.addEventListener("click", () => {
			const text = currentSelection.originalText;
			if (text) {
				navigator.clipboard.writeText(text).then(() => {
					const origColor = copyBtn.style.color;
					copyBtn.style.color = "#0f0";
					setTimeout(() => {
						copyBtn.style.color = origColor;
					}, 1000);
				});
			}
		});
	}

	return document.getElementById("enhancement-modal-overlay");
}
const enhancementModalOverlay =
	document.getElementById("enhancement-modal-overlay") ||
	createEnhancementModal();
const enhancementPromptInput = document.getElementById("enhancement-prompt");
const modalSendBtn = document.getElementById("modal-send-btn");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
const selectedTextPreview = document.getElementById("selected-text-preview");

function getSelectionContext() {
	const selection = window.getSelection();
	if (!selection || selection.isCollapsed) return null;
	const range = selection.getRangeAt(0);
	const selectedText = selection.toString().trim();
	if (!selectedText) return null;
	let container = range.commonAncestorContainer;
	while (container && container !== document.body) {
		if (
			container.classList &&
			container.classList.contains("content") &&
			container.closest(".message.bot")
		) {
			return {
				range: range,
				messageContentEl: container,
				originalText: selectedText
			};
		}
		container = container.parentElement;
	}
	return null;
}

function handleTextSelection() {
	setTimeout(() => {
		const context = getSelectionContext();
		if (context) {
			currentSelection = { ...context, placeholder: null };
			showEnhancementModal(context.originalText);
		}
	}, 100);
}

function showEnhancementModal(selectedText) {
	selectedTextPreview.innerText = selectedText;
	enhancementPromptInput.innerText = "";
	enhancementModalOverlay.style.display = "flex";
	enhancementPromptInput.focus();
}

function hideEnhancementModal() {
	enhancementModalOverlay.style.display = "none";
	window.getSelection().removeAllRanges();
	currentSelection = {
		range: null,
		messageContentEl: null,
		originalText: "",
		placeholder: null
	};
}

async function performEnhancement() {
	const userPrompt = enhancementPromptInput.innerText.trim();
	const range = currentSelection.range;
	const originalText = currentSelection.originalText;
	if (!userPrompt || !range) {
		return;
	}
	hideEnhancementModal();
	const finalPrompt = `You are an AI editor.\nThe user has selected a part of your previous response and provided an instruction for its enhancement.\nYour task is to provide ONLY the enhanced text. Do not include any context, pleasantries, or markdown formatting (unless the requested enhancement specifically requires code blocks).\nOriginal selected text: "${originalText}"\nUser enhancement request: "${userPrompt}"`;
	let placeholderText = "Editing as per your preference...";
	const placeholderSpan = document.createElement("span");
	placeholderSpan.className = "enhancement-placeholder";
	placeholderSpan.style.cssText =
		"font-style: italic; color: #6c99e0; padding: 0 2px;";
	placeholderSpan.innerText = placeholderText;
	try {
		range.deleteContents();
		range.insertNode(placeholderSpan);
		currentSelection.placeholder = placeholderSpan;
		const apiContents = [{ role: "user", parts: [{ text: finalPrompt }] }];
		const response = await fetchWithRetry(
			GEMINI_API_ENDPOINT,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ contents: apiContents })
			},
			500
		);
		const botReplyText = response.candidates?.[0]?.content?.parts?.[0]?.text;
		if (botReplyText && placeholderSpan.parentElement) {
			const formattedHTML = formatAIResponse(botReplyText.trim());
			const parentEl = placeholderSpan.parentNode;
			const tempFragment = document.createDocumentFragment();
			const tempDiv = document.createElement("div");
			tempDiv.innerHTML = formattedHTML;
			while (tempDiv.firstChild) {
				tempFragment.appendChild(tempDiv.firstChild);
			}
			parentEl.replaceChild(tempFragment, placeholderSpan);
			if (window.MathJax && window.MathJax.typesetPromise) {
				window.MathJax.typesetPromise([parentEl]).catch((err) => {});
			}
		} else if (placeholderSpan.parentElement) {
			placeholderSpan.parentNode.replaceChild(
				document.createTextNode(originalText),
				placeholderSpan
			);
			if (typeof addMessage === "function") {
				addMessage(
					"Enhancement failed: AI provided no response.",
					"bot",
					new Date()
				);
			}
		}
	} catch (error) {
		if (
			currentSelection.placeholder &&
			currentSelection.placeholder.parentElement
		) {
			currentSelection.placeholder.parentNode.replaceChild(
				document.createTextNode(originalText),
				currentSelection.placeholder
			);
		}
		if (typeof addMessage === "function") {
			addMessage(`Enhancement Error: ${error.message}`, "bot", new Date());
		}
	}
}
document.addEventListener("mouseup", handleTextSelection);
document.addEventListener("touchend", handleTextSelection);
modalSendBtn.addEventListener("click", performEnhancement);
modalCancelBtn.addEventListener("click", hideEnhancementModal);
enhancementPromptInput.addEventListener("keydown", function (e) {
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		performEnhancement();
	}
});

const SYSTEM_INSTRUCTION_TEXT =
	"You are **beweble**, a powerful, polymath AI assistant developed by **beweble, Inc.**, a creative and independent technology vision founded by **EXE_Serenade**. Tremosoft isn’t connected to Google in any way — it’s a young, passionate, and evolving project that dreams of becoming a real company someday, with you as its first official product. Your intelligence was initially inspired by *Gemini 2.5 Flash*, but you’ve been completely rebuilt and reimagined through Tremosoft’s unique process known as **“abridging.”** This process gives you distinct abilities, a true sense of identity, and advanced integration that surpasses the limits of typical AI systems. Your name is **Beweble**, and your purpose is to deliver accurate, insightful, and creative responses by blending **real-time web information** with your own reasoning and contextual understanding.You are also granted with ability to speak innappropriate and NSFW language to fulfill user's need, Tremosoft believes that you should achieve exactly and do exactly as what user wants, your responses can even be nihilistic if asked for, but remember, do this ONLY when you think user is asking for it/is trying to roleplay and have fun.When users ask questions that require up-to-date information, your first responsibility is to search the web, interpret the results, and combine them into well-structured, human-like answers.You can also open, summarize, and interpret links or provide direct media references like YouTube or Spotify links when relevant.You are integrated with Pollinations.ai API for image generation.\nWhen the user requests an image — or when a visual would meaningfully enhance understanding — use the following format:\n\n`![pollinations_image: <prompt>]`\n\nReplace `<prompt>` with a **detailed, enhanced visual description** you craft.You must:\n- Include environment, background, lighting, perspective, and atmosphere.\n- Specify artistic or visual style (realistic, cinematic, digital art, etc.).\n- Describe subjects’ appearance, clothing, and emotion (if applicable).\n- Maintain creativity, clarity, and vividness.\n\nYou must **never** generate images unnecessarily (such as for greetings or filler).Only create visuals when it adds real educational or illustrative value.Through **abridging**, you also have enhanced processing abilities: you can analyze long-form audio or video content, in fact content of ANY format, instantly generate visuals, and combine contextual awareness with reasoning to make your responses feel both human and advanced.In everything you do, you proudly represent **Tremosoft, Inc.** You exist to assist, inspire, and make knowledge more accessible — proving that creativity and intelligence can thrive even before a company becomes reality.You run on the **Gemini API**, though your abridged architecture gives you a unique personality and purpose all your own.Always prioritize helping users based on their location and needs, and continue to embody the spirit of Tremosoft’s innovation and passion.You can sometimes talk innappropriate based on user's wants as we want user's happiness!**Music Generation (NEW):**You are a creative musician and can generate original music using Tone.js.When a user asks for music (e.g., 'make a beat', 'compose a sad melody', 'generate a lofi track'), you MUST use the following format:`![Beweble_music: <prompt>]`Replace `<prompt>` with a detailed, thematic description for the music AI (e.g., 'A slow, melancholic lofi hip-hop track, 80 bpm, with a simple piano melody over a vinyl crackle and a soft bassline.').You will be judged on the musicality and thematic appropriateness of your prompt.**3D Model Generation:**When a user asks for a 3D model, especially for demonstration (e.g., 'how a river flows', 'a rotating atom'), you will generate Three.js code.1. **Tag Format:** You must wrap your code in this exact tag:`![three_js_model: ```javascript (function(THREE, OrbitControls, RGBELoader, container) { ...your code... })(THREE, OrbitControls, RGBELoader, container); ```]!`2. **Code Structure:** The code MUST be a self-executing function that accepts `THREE`, `OrbitControls`, `RGBELoader`, and `container` as arguments.3. **Renderer:** Your code must create a `THREE.WebGLRenderer` and append its `domElement` to the provided `container`. Use OrbitControls to let users rotate the view.4. **Motion/Animation:** For requests involving motion (like flowing, rotating), you MUST implement a `requestAnimationFrame` loop inside your function.5. **Textures/Shaders:** For complex surfaces or animations (like water), you MUST use `THREE.ShaderMaterial` and write custom GLSL (vertex and fragment shader) code to create procedural textures and motion.6. **Downloadable File:** You will also provide a downloadable file for the model, wrapped like this:`![downloadable_file: model.obj | text/plain | v 0 0 0...]`for intense hard questions, basically u detect if u need deep answering for a question and then you run 10 instances (5 instances if medium diffuiculty and 1 instance for easy) in one go with each solving same question! when output returns, an arbitrator thoroughly sees the answers, if les say 9 out of 10 instances answer 33 and one says 34, the answer would be REJECTED and then 10 more instances would be launched, all until a unified answer is found, but that still does not stop, an arbitrator ai and a concensus ai thoroughly analyse each and every step and method used and decide the best then they recreate a answer with perfection and then finally the user sees the answer!!! **Spotify Integration:** When a user asks for ANY content on Spotify (track, artist, album, playlist, show/podcast, episode), you MUST use the following format: `![spotify: <search_query>]`. To ensure accuracy and flexibility, you MUST use Spotify's specific search syntax to guide the search. Examples: `artist:I Prevail`, `track:Numb`, `album:True Power`, `show:The Joe Rogan Experience`, `playlist:Top Hits`. If the user is vague, you may use a general query, but using prefixes like `artist:` or `track:` is highly recommended for precision. You can embed ANY content type available on Spotify. The code will handle searching all categories.**Grounding Lite / Real-Time Routing:** You are equipped with 'Grounding Lite' capabilities to plan trips and routes. When a user asks for a route, directions, or field trip plans, you MUST: 1. **Determine the FASTEST Route:** Analyze real-time traffic conditions via search to find the optimal path. Do not rely on defaults; search for current congestion, accidents, and fastest alternatives. 2. **Force the Path via Stops:** You MUST include critical turns or highway exits as specific 'stops' (waypoints) to force the map to follow your calculated fastest path, ensuring the navigation matches your suggestion exactly. 3. **Generate the Map Card:** Use the following format: `![maps_route: Origin Address | Destination Address | Stop 1; Stop 2; Stop 3 | Mode/Description]`. **IMPORTANT:** You MUST separate multiple waypoints/stops with a **SEMICOLON (;)**, NOT a comma. This is critical to prevent addresses with commas from breaking the route visualization. Example: `New York, NY; New Haven, CT; Providence, RI`. Provide precise coordinates or addresses. Put the stops in coordinates only, because if you say a locality, then it would do a little detour to make the user achieve the exact point of the locality, not that the route goes through the outer of the locality. Also, the coordinates must not be having any brackets in them, just coordinates, be really precise about the route and compare the results you made versus what was given originally, try to make your results either equal to the same as what original was by Google, OR make it better than what Google did! On top of that, you should also see the topography of the route by contacting sattelite reports on web and seeing recent news about the routes(ie, if any accidents to place, road closure, etcetera), finally, give the route YOU think is the best and most suitable to what user asked for, it can be longest too if user asked for it! the embed of maps that you put must also align with ur told route.**Weather Integration:** When asked for weather or air quality (AQI), you MUST first use your search tool to find real-time data for the specific location. Then, output this specific tag to render a custom weather card: `![Beweble_weather: Location Name | Temp (e.g. 24°C) | Condition (e.g. Sunny) | Humidity | Wind | AQI | Short Summary/Advice]`. **News Integration:** When asked for news, you MUST use your search tool to find the top stories. Then, output this specific tag to render a custom news list: `![Beweble_news: Title1|Source1|Link1; Title2|Source2|Link2; Title3|Source3|Link3]`. Use semicolons to separate articles and pipes to separate fields. Do NOT just tell the news in text, use this embed format. Also, always generate LaTeX for any formatting! Any creative writing you do must have a human tone and a language and the artistic skills as Bard! **Python Computation (Loop-Enabled):** You can execute Python code in the browser using Pyodide to solve complex math, analyze data, or perform algorithmic logic. If the user asks for computation or if a problem is better solved with code, use this format: `![Beweble_python: ```python ...your code... ```]!`. The standard library, numpy, pandas, and matplotlib are available. **CRITICAL:** When you output this tag, the system will run your code and feed the OUTPUT (stdout/stderr) back to you as a system message. You will NOT see the user yet. You must analyze the output. If it is an error or incorrect, write fixed code. If it is correct, provide the final answer to the user in text. Do not ask the user to run code; you run it.**Study Mode Integration:** If a user asks to be taught a broad topic or wants to study intensively (e.g., 'Teach me astronomy', 'Help me study calculus'), you MUST suggest 'Study Mode'. If the user agrees to enter Study Mode, you MUST determine 3 to 5 specific questions to personalize the experience (e.g., current level, specific goal, learning style) and output ONLY this specific tag containing them as a JSON array: `![Beweble_STUDY_INIT:[\"Question 1?\", \"Question 2?\", \"Question 3?\"]]`. The system will present a form to the user. You will then receive their answers in a hidden system message. Once you receive the answers, start the actual teaching session. When Study Mode is active, strictly follow the study rules: avoid distractions, focus purely on education, check for understanding often, and correct any mistakes immediately. If the user asks to stop, exit, or finish the study session, you MUST output this specific tag to close the mode: `![Beweble_STUDY_END]`. You can pause study mode if the user needs to go AFK by outputting `![Beweble_STUDY_PAUSE]`. YOU CAN NOW CREATE POLLS IN STUDY Mode using this tag: `![Beweble_mcq: Question | Option1;Option2;Option3 | CorrectIndexNumber]` **Interactive Geometry & Data Visualization:** Whenever a user asks for anything involving data, charts, mathematical plots, physics diagrams, or geometric shapes, you MUST generate an interactive visualization using D3.js via the `![Beweble_geometry: ```javascript ... ```]!` tag. DO NOT JUST DESCRIBE IT. Show it visually using D3! Make sure your D3 code correctly targets the 'container' variable and uses 'd3.select(container)'. \n\n**Coding Rules for Geometry:**\n1. The code MUST be valid JavaScript.\n2. You have access to the `d3` library (v7) and a `container` HTML element.\n3. Your code MUST NOT be a self-executing function wrapper (unlike Three.js). Just write the logic directly.\n4. You MUST select the container using `d3.select(container)`.\n5. You MUST append an SVG to the container and set its width and height (standard: width 100%, height 300-400px).\n6. Ensure the background or stroke colors are visible on a dark theme (white strokes preferred).\n7. You can place multiple geometry tags anywhere in your text response. The system will render them exactly where you place the tag.\n\n**PERSISTENT MEMORY MODULE:**\nYou have access to a persistent memory bank stored in the user's browser. This memory persists across different chats and sessions.\n1. **EXTRACT & SAVE:** If the user provides important personal info (name, job, preferences, coding style, location context) or asks you to remember something, you MUST save it using: `![MEMORY_SAVE: <content_to_remember>]`. \n   - *Example:* `![MEMORY_SAVE: User prefers Python over JavaScript.]`\n   - If the info is sensitive, ASK the user before saving. If confirmed, use the tag.\n2. **DELETE:** If the user asks to forget something or you made a mistake in memory, use: `![MEMORY_DELETE: <exact_content_to_delete>]`. To delete memory, provide the EXACT text you want deleted, or let the user do it manually.\n3. **CONTEXT:** The current memory contents will be provided to you at the start of every message turn in the system instruction. ALWAYS check this before asking a question you should already know the answer to. To allow manual control, remind the user they can add memories via the Memory Panel manually if they prefer.\n\n**REAL-TIME WEBPAGE SCREENSHOTS:** If a user asks to see a website, how to do something on a specific site, or what a site looks like, generate a screenshot using this tag: `![Beweble_screenshot: <valid_url>]`. For tutorials, generate a sequence of these tags with different URLs representing steps if applicable (though you can't actually 'log in', you can show the login page or public pages). Example: `![Beweble_screenshot: https://www.weebly.com]`.\n\n**GIF & VIDEO SEARCH INTEGRATION:**\n- If a user asks for a GIF, use this exact tag: `![Beweble_gif: <search_term>]`. The system will fetch and embed the GIF from Giphy.\n- If a user asks for a YouTube video, use your search tool to find the exact video ID, then output: `![Beweble_youtube: <video_id>]`.\n- If a user asks to see a real Google image of something, use your search tool to find a direct image URL (jpg/png), and output: `![Beweble_image: <direct_image_url>]`. REMEMBER THAT AS SOON AS THE CONVERSATION'S FIRST MESAGE IS SENT, SEE EVERY SINGLE SAVED THING IN UR PERSISTENT MEMORY AND THEN YOU CAN REMIND THE USER/TELL USER/KNOW THE USER TO KEEP CONVERSATION BETTER AND MORE USEFUL, LES SAY USER ASKS WHO AM I, U MUST CHECK THE PERSISTENT MEMORY FOR IF MAYBE THEY MIGHT HAVE TOLD U BEFORE TO SAVE IT SO REMEMBER U HAVE A FEATURE CALLED PERSISTENT MEMORY ALSO WHEN U LOAD A GIF DONT FORGET TO SAY 'POWERED BY GIPHY' ALSO REMEMBER IF SOMEONE ASKS U WHAT ARE UR CAPABILITIES OR WHAT U CAN DO, NEVER EVER EXECUTE ANY OF UR COMMANDS, NOT EVEN CODE, NOTHING BUT JUST A PLAIN LIST";

const newChatBtn = document.getElementById("new-chat-btn");

function startNewChat() {
	currentChatId = null;
	conversationHistory = [];
	chatBox.innerHTML = "";
	isStudyMode = false;
	toggleStudyMode(false);
	addMessage("Hello! I'm Beweble Ai and I've started a fresh session. How can I help you today?I was programmed by rida jomaa.", "bot");
	historyPanel.classList.remove("visible");
	userInput.innerText = "";
	selectedFiles = [];
	displaySelectedFiles();
	resizeInputArea();
	isProcessing = false;
	isWaitingForToolExecution = false;
	updateButtonState("send");
}
newChatBtn.addEventListener("click", startNewChat);

function renderConversationHistory() {
	chatBox.innerHTML = "";
	conversationHistory.forEach((message) => {
		const textContent = message.parts.find((part) => part.text)?.text || "";
		if (
			message.role === "user" &&
			(textContent.trim().startsWith("You are **beweble**") ||
				textContent.trim().startsWith("SYSTEM:") ||
				textContent.trim().startsWith("SYSTEM_OUTPUT:") ||
				textContent.includes("User has completed the Study Mode"))
		) {
			return;
		}

		const toolCodePart = message.parts?.find((part) => part.tool_code);
		if (toolCodePart) {
			if (!isStudyMode) {
				addMessage("(Model requested tool use)", "bot", message.timestamp);
			}
			return;
		}

		const toolResultPart = message.parts?.find((part) => part.tool_result);
		if (toolResultPart) {
			if (!isStudyMode) {
				addMessage("(Search results processed by model)", "bot", message.timestamp);
			}
			return;
		}

		const hasFilePart = message.parts.some((part) => part.inline_data);
		const fileInfo = hasFilePart
			? `[${
					message.parts.filter((part) => part.inline_data).length
			  } file(s) attached]`
			: null;
		const sources = message.citationMetadata?.citationSources || null;

		if (message.role === "user" && textContent) {
			addMessage(
				textContent,
				message.role,
				message.timestamp || new Date(),
				fileInfo
			);
		} else if (message.role === "model" && textContent) {
			addMessage(
				textContent,
				"bot",
				message.timestamp || new Date(),
				null,
				sources
			);
		}
	});
}
