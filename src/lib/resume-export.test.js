import { test, expect } from 'bun:test';
import { escapeHtml, resumeHtml } from './resume-export';
test('export escapes executable user input', () => {
  const html = resumeHtml({ fullName: '<script>alert(1)</script>', headline: '<img src=x onerror=alert(1)>', contact: 'a&b' }, { summary: '<iframe src="https://example.com">', sections: [{ heading: '<svg onload=alert(1)>', items: ['</li><script>bad()</script>'] }] });
  expect(html).not.toContain('<script>'); expect(html).not.toContain('<iframe'); expect(html).not.toContain('<svg'); expect(html).toContain('&lt;script&gt;'); expect(html).toContain('a&amp;b');
});
test('all HTML delimiters are escaped', () => expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;'));