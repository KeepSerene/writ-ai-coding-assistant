const landingPageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="author" content="Dhrubajyoti Bhattacharjee">
  <title>Writ Server</title>

  <style>
    /* Catppuccin Mocha Palette */
    :root {
      --base: #1e1e2e;
      --mantle: #181825;
      --text: #cdd6f4;
      --subtext0: #a6adc8;
      --surface0: #313244;
      --surface1: #45475a;
      --green: #a6e3a1;
    }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--base);
      color: var(--text);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
    }

    h1 {
      font-size: 3.5rem;
      margin-bottom: 0.5rem;
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
      gap: 1rem;
      background-color: var(--mantle);
      border: 1px solid var(--surface0);
      padding: 0.5rem 0.5rem 0.5rem 1.5rem;
      border-radius: 12px;
      margin-top: 2rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    code {
      font-size: 1.2rem;
      color: var(--green);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    button {
      background-color: var(--surface0);
      color: var(--text);
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s ease;
    }

    button:hover {
      background-color: var(--surface1);
    }

    button.success {
      color: var(--green);
    }

    svg {
      width: 16px;
      height: 16px;
    }
  </style>
</head>

<body>
  <h1>Writ Server ⚡️</h1>

  <p class="subtitle">If you arrived here from your billing portal, your transaction is complete! You can safely close this tab and return to your terminal.</p>

  <div class="command-container">
    <code id="command-text">npx @writ/cli</code>

    <button type="button" id="copy-btn" aria-label="Copy command">
      <span id="btn-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
      </span>
      
      <span id="btn-text">Copy</span>
    </button>
  </div>

  <script>
    const copyBtn = document.getElementById('copy-btn');
    const commandText = document.getElementById('command-text').innerText;
    const btnText = document.getElementById('btn-text');
    const btnIcon = document.getElementById('btn-icon');

    const copySvg = \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>\`;
    
    const checkSvg = \`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>\`;

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(commandText);
        
        // Success state
        btnText.innerText = 'Copied';
        btnIcon.innerHTML = checkSvg;
        copyBtn.classList.add('success');

        // Reset after 3 seconds
        setTimeout(() => {
          btnText.innerText = 'Copy';
          btnIcon.innerHTML = copySvg;
          copyBtn.classList.remove('success');
        }, 3000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
        btnText.innerText = 'Failed';
        setTimeout(() => {
          btnText.innerText = 'Copy';
        }, 3000);
      }
    });
  </script>
</body>
</html>
`;

export default landingPageHtml;
