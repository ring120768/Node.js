const renderer = require('../aiAnalysisHtmlRenderer');

describe('AiAnalysisHtmlRenderer.ensureHeader', () => {
  test('injects header and CSS when missing', () => {
    const input = `
      <html>
        <head><title>Test</title></head>
        <body>
          <p>Body content</p>
        </body>
      </html>
    `;

    const output = renderer.ensureHeader(input);

    expect(output).toContain('class="header"');
    expect(output).toContain('class="page"');
    expect(output).toContain('Car Crash Lawyer AI');
    expect(output).toContain('TRAFFIC ACCIDENT LEGAL REPORT');
    expect(output).toContain('class="header-title"');
    expect(output).toContain('class="content"');
  });

  test('does not duplicate header when already present', () => {
    const input = `
      <html>
        <head><title>Test</title></head>
        <body>
          <div class="header">Existing</div>
          <div class="content">Body</div>
        </body>
      </html>
    `;

    const output = renderer.ensureHeader(input);
    const headerCount = (output.match(/class="header"/g) || []).length;

    expect(headerCount).toBe(1);
    expect(output).toContain('Existing');
  });
});
