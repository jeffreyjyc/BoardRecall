> [!TIP]
> The Main Branch on Github is most likely unstable! Check to see the latest branch labelled **current** for the "stable" version. 

# BoardRecall - Smart Medical Exam Companion

BoardRecall is a powerful tool designed for medical students to convert clinical vignettes and explanations from platforms like UWorld and TrueLearn into high-yield Anki-style flashcards and board-style practice questions.

## 🚀 Features

- **Smart Content Extraction**: Automatically detects questions and explanations on UWorld and TrueLearn.
- **Clipboard Sync**: Copy text on the page (Ctrl+C or Ctrl+Insert) and it instantly appears in the extension.
- **Anki-Style Flashcards**: Generates cloze-deletion cards optimized for long-term retention.
- **Board Question Generator**: Creates new clinical vignettes based on your study material to test your understanding.
- **Multi-AI Support**: Use Gemini (Free Tier) or run locally using Ollama.

---

## 🛠️ Installation Instructions (Browser Extension)

### Prerequisites
Before you begin, make sure you have **Node.js** installed on your computer. This is required to build the extension.
1. Download and install Node.js from: [https://nodejs.org/en/download](https://nodejs.org/en/download)
2. Follow the installer prompts (the "LTS" version is recommended).

To use BoardRecall as a sidebar or popup in your browser, follow these steps:

### Step 1: Prepare the Code
1. Download the source code to your computer.
2. Open your terminal (Command Prompt, PowerShell, or Terminal).
3. Navigate to the project folder:
   ```bash
   cd path/to/boardrecall
   ```
4. Install the necessary dependencies:
   ```bash
   npm install
   ```
5. Build the extension:
   ```bash
   npm run build
   ```
   *This will create a folder named `dist` in your project directory.*

### Step 2: Install in Chrome or Edge
1. Open your browser and navigate to the extensions page:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
2. In the top right corner, toggle **Developer mode** to **ON**.
3. Click the **Load unpacked** button that appears.
4. Navigate to your project folder and select the **`dist`** folder.
5. BoardRecall should now appear in your extensions list!

### Step 3: Pin and Open
1. Click the "Puzzle" icon (Extensions) in your browser toolbar.
2. Find **BoardRecall** and click the "Pin" icon.
3. Click the BoardRecall icon to open the generator.

---

## 🔑 Setting Up Your API Key (No .env required)

You do **not** need to modify any code files to set up your API key.

1. Open the BoardRecall extension.
2. Click the **Settings** (gear icon) in the top right corner.
3. **Gemini (Recommended)**: 
   - Get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Paste it into the "Gemini API Key" field.
   - Choose between Gemini 1.5 Flash (Free) or Gemini 2.0 Flash.
4. **Local (Ollama)**:
   - If you have Ollama running locally, switch to the "Local" tab and configure your endpoint.

---

## 🖥️ Running as a Full Browser Page

If you prefer to use BoardRecall in its own tab rather than a small popup:

1. Right-click the BoardRecall extension icon in your toolbar.
2. Select **"Open in new tab"** (if available) or simply click the **"Expand to Tab"** button inside the extension header.
3. You can also bookmark the extension's internal URL to access it like a regular website.

---

## 👨‍💻 Developer Notes

- **Framework**: React + Vite + Tailwind CSS
- **AI SDK**: `@google/genai`
- **Icons**: Lucide React
- **Animations**: Motion (formerly Framer Motion)
