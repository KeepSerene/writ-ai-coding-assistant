const landingPageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="author" content="Dhrubajyoti Bhattacharjee">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <title>Writ Server</title>

  <style>
    :root {
      --primary: #009688;
      --base: #0d1117;
      --mantle: #161b22;
      --text: #e6edf3;
      --subtext0: #8b949e;
      --surface0: #21262d;
      --surface1: #30363d;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--base);
      color: var(--text);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 2rem;
      text-align: center;
    }

    .logo {
      width: 80px;
      height: 80px;
      object-fit: conver;
      margin-bottom: 1rem;
      filter: drop-shadow(0 4px 12px rgba(0, 150, 136, 0.2)); 
      user-select: none;
    }

    h1 {
      font-size: clamp(2.5rem, 5vw, 3.5rem);
      margin-bottom: 0.5rem;
      margin-top: 0;
      letter-spacing: -0.05em;
    }

    p {
      color: var(--subtext0);
      font-size: 1.1rem;
      max-width: 500px;
      line-height: 1.6;
    }

    .subtitle {
      margin-top: 1.5rem;
      font-size: 0.95rem;
    }

    .command-container {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 1rem;
      background-color: var(--mantle);
      border: 1px solid var(--surface0);
      padding: 0.5rem 0.5rem 0.5rem 1rem;
      border-radius: 12px;
      margin-top: 2rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 400px;
    }

    code {
      font-size: 1.2rem;
      color: var(--primary);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    button {
      background-color: var(--surface0);
      color: var(--text);
      border: 1px solid transparent;
      padding: 0.6rem;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    button:hover {
      background-color: var(--surface1);
    }

    button:focus-visible {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(0, 150, 136, 0.3);
    }

    button.success {
      color: var(--primary);
      background-color: rgba(0, 150, 136, 0.1);
      border-color: rgba(0, 150, 136, 0.2);
    }

    svg {
      width: 16px;
      height: 16px;
    }
  </style>
</head>

<body>
  <img src="/assets/logo.webp" alt="Writ Logo" class="logo" draggable="false">
  
  <h1>Writ Server</h1>

  <p class="subtitle">If you arrived here from your billing portal, your transaction is complete! You can safely close this tab and return to your terminal.</p>

  <div class="command-container">
    <code id="command-text">npx @writ/cli</code>

    <button type="button" id="copy-btn" aria-label="Copy command" title="Copy command">
      <span id="btn-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
      </span>
    </button>
  </div>

  <script>
    const copyBtn = document.getElementById('copy-btn');
    const commandText = document.getElementById('command-text').innerText;
    const btnIcon = document.getElementById('btn-icon');

    const copySvg = \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>\`;
    
    const checkSvg = \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>\`;

    const setButtonState = (label, svg, isSuccess = false) => {
      copyBtn.setAttribute('aria-label', label);
      copyBtn.setAttribute('title', label);
      btnIcon.innerHTML = svg;
      
      if (isSuccess) {
        copyBtn.classList.add('success');
      } else {
        copyBtn.classList.remove('success');
      }
    };

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(commandText);
        setButtonState('Copied!', checkSvg, true);
        setTimeout(() => setButtonState('Copy command', copySvg, false), 3000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
        setButtonState('Failed to copy', copySvg, false);
        setTimeout(() => setButtonState('Copy command', copySvg, false), 3000);
      }
    });
  </script>
</body>
</html>
`;

export default landingPageHtml;
