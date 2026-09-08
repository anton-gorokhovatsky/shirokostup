import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { richText, renderContent, renderGallery, validateContent } from '../scripts/render-content.mjs';

const content = JSON.parse(await readFile(new URL('../content/site.json', import.meta.url), 'utf8'));
test('editorial data renders every project, image and reading item', () => {
  const blocks = renderContent(content, '<svg aria-hidden="true"></svg>');
  for (const project of content.projects) {
    assert.ok(blocks[`project-${project.id}`].includes(project.url));
    if (project.images) assert.equal((blocks[`gallery-${project.id}`].match(/<picture/g) || []).length, project.images.length);
  }
  assert.equal((blocks.texts.match(/<strong>/g) || []).length, content.texts.length);
});
test('invalid editorial data fails before publication', () => {
  const bad = structuredClone(content);
  bad.projects[0].images[0].alt = '';
  assert.throws(() => validateContent(bad), /alt/);
  bad.projects[0].images[0].alt = 'Image description';
  bad.projects[0].url = 'javascript:alert(1)';
  assert.throws(() => validateContent(bad), /HTTPS/);
  bad.projects[0].url = content.projects[0].url;
  bad.projects.push(bad.projects[0]);
  assert.throws(() => validateContent(bad), /duplicate/);
});
test('editorial markup preserves titles while rejecting arbitrary HTML', () => {
  assert.equal(richText('A <cite>Title</cite> & a link'), 'A <cite>Title</cite> &amp; a link');
  for (const input of ['<img src=x>', '<em>unclosed', '<cite>wrong</em>', '<a href="javascript:alert(1)">x</a>']) assert.throws(() => richText(input));
});
test('new gallery records receive dimensions, sources and safe inactive state', () => {
  const images = [...content.projects[0].images, content.projects[0].images[0]];
  const html = renderGallery(images);
  assert.equal((html.match(/<source/g) || []).length, images.length * 2);
  assert.equal((html.match(/tabindex="0"/g) || []).length, 0);
  assert.ok(!html.includes('role="button"'), 'Static images become controls only after their handlers load.');
  assert.equal((html.match(/aria-hidden="true"/g) || []).length, images.length - 1);
});
