export type ResumeContent = { summary: string; sections: { heading: string; items: string[] }[] };
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}
export function resumeHtml(person: { fullName: string; headline: string; contact: string }, data: ResumeContent) {
  const text = escapeHtml;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; form-action 'none'; base-uri 'none'"><title>${text(person.fullName)} — Resume</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.5}h1{margin-bottom:4px}h2{margin-top:28px;border-bottom:1px solid;padding-bottom:4px;font-size:15px;text-transform:uppercase}li{margin-bottom:6px}</style></head><body><h1>${text(person.fullName)}</h1><p>${text(person.headline)}</p><p>${text(person.contact)}</p><p>${text(data.summary)}</p>${data.sections.map(s => `<h2>${text(s.heading)}</h2><ul>${s.items.map(i => `<li>${text(i)}</li>`).join('')}</ul>`).join('')}</body></html>`;
}