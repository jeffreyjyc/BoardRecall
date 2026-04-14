// Content script to extract medical question data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractContent") {
    let extractedText = "";
    
    // 1. Check for selected text first
    const selection = window.getSelection()?.toString();
    if (selection && selection.length > 20) {
      extractedText = selection;
    } else {
      // 2. Specific selectors for TrueLearn and UWorld
      const selectors = [
        '.question-content', 
        '.explanation-content',
        '.question-text',
        '.explanation-text',
        '#question-container',
        '#explanation-container',
        '.test-question-container',
        '.answer-explanation',
        '.vignette',
        '.stem',
        '.question-body',
        '.explanation-body',
        '.tl-question-text',
        '.tl-explanation-text',
        '.tl-content',
        '.tl-vignette',
        // TrueLearn specific common patterns
        '[id*="question"]',
        '[id*="explanation"]',
        '[class*="QuestionText"]',
        '[class*="ExplanationText"]'
      ];

      let combinedText = [];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = (el as HTMLElement).innerText.trim();
          if (text.length > 30 && !combinedText.includes(text)) {
            combinedText.push(text);
          }
        });
      });

      if (combinedText.length > 0) {
        extractedText = combinedText.join("\n\n");
      } else {
        // 3. Heuristic: Find the largest text block that isn't navigation
        const allDivs = Array.from(document.querySelectorAll('div, section, article, p'));
        let bestText = "";
        let maxScore = 0;

        allDivs.forEach(el => {
          const text = (el as HTMLElement).innerText.trim();
          // Simple score: length but penalize common nav words
          if (text.length > 100 && text.length < 10000) {
            let score = text.length;
            if (text.toLowerCase().includes('copyright') || text.toLowerCase().includes('terms of use')) score -= 500;
            if (score > maxScore) {
              maxScore = score;
              bestText = text;
            }
          }
        });
        extractedText = bestText || document.body.innerText;
      }
    }

    // Clean up the text (remove excessive whitespace)
    extractedText = extractedText.replace(/\n\s*\n/g, '\n\n').trim();

    sendResponse({ content: extractedText });
  }
  return true;
});

// Listen for copy events (Ctrl+C or Ctrl+Insert) to automatically sync with extension
document.addEventListener('copy', () => {
  // Wait a tiny bit for the clipboard to be updated or just grab the selection
  setTimeout(() => {
    const selection = window.getSelection()?.toString();
    if (selection && selection.length > 10) {
      chrome.storage.local.set({ lastCopiedText: selection });
    }
  }, 100);
});
