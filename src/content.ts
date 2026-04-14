// Content script to extract medical question data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractContent") {
    // Try to find common question/explanation containers
    // This is a heuristic approach since these sites use dynamic classes
    
    let extractedText = "";
    
    // 1. Check for selected text first (user might have highlighted the specific part)
    const selection = window.getSelection()?.toString();
    if (selection && selection.length > 50) {
      extractedText = selection;
    } else {
      // 2. Heuristic: Look for large text blocks that look like questions
      // UWorld often uses specific IDs or classes like 'question-content' or 'explanation'
      const possibleContainers = document.querySelectorAll('div[class*="question"], div[class*="explanation"], section, article');
      
      let bestContainer = null;
      let maxLen = 0;
      
      possibleContainers.forEach(container => {
        const text = (container as HTMLElement).innerText;
        if (text.length > maxLen) {
          maxLen = text.length;
          bestContainer = container;
        }
      });
      
      if (bestContainer) {
        extractedText = (bestContainer as HTMLElement).innerText;
      } else {
        // Fallback to body text but filtered
        extractedText = document.body.innerText;
      }
    }

    sendResponse({ content: extractedText });
  }
  return true;
});
