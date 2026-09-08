// Build-time editorial data only. The browser receives semantic HTML, not a content app.
export const escapeHtml = (value) => String(value).replace(/ +· /g, '\u00a0· ').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll('\u00a0', '&nbsp;');

const text = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} needs non-empty text.`);
  return value;
};
const https = (value) => {
  if (new URL(value).protocol !== 'https:') throw new Error(`Expected an HTTPS destination: ${value}`);
  return value;
};

// Only these small editorial marks are supported in rich-text fields.
export const richText = (value) => {
  const stack = [];
  const output = text(value, 'Rich text').split(/(<[^>]*>)/g).map(part => {
    if (!part.startsWith('<')) return escapeHtml(part);
    const tag = part.match(/^<(em|cite|a)(?: href="(https:\/\/[^"<>]+)")?>$/);
    if (tag && (tag[1] === 'a') === Boolean(tag[2])) {
      stack.push(tag[1]);
      return tag[2] ? `<a href="${escapeHtml(https(tag[2]))}">` : part;
    }
    const close = part.match(/^<\/(em|cite|a)>$/);
    if (close && stack.pop() === close[1]) return part;
    throw new Error(`Unsupported or unbalanced editorial markup: ${part}`);
  }).join('');
  if (stack.length) throw new Error('Unclosed editorial markup.');
  return output;
};

export function validateContent(content) {
  text(content.hero, 'Hero');
  for (const key of ['title', 'note']) text(content.practice[key], `Practice ${key}`);
  for (const key of ['title', 'introduction']) text(content.about[key], `About ${key}`);
  if (!content.about.paragraphs?.length) throw new Error('Biography needs paragraphs.');
  content.about.paragraphs.forEach(richText);
  const ids = new Set();
  if (!content.projects?.length) throw new Error('Projects must not be empty.');
  for (const project of content.projects) {
    if (!/^[a-z][a-z0-9-]*$/.test(project.id) || ids.has(project.id)) throw new Error(`Invalid or duplicate project id: ${project.id}`);
    ids.add(project.id);
    for (const field of ['title', 'type', 'description', 'action']) text(project[field], `${project.id}.${field}`);
    https(project.url);
    richText(project.description);
    if (project.since && !/^\d{4}$/.test(project.since)) throw new Error('Project start needs a four-digit year.');
    if (!project.since) text(project.date, `${project.id}.date`);
    if (project.publication) {
      text(project.publication.title, 'Publication title');
      text(project.publication.subtitle, 'Publication subtitle');
    }
    if (project.images && !project.images.length) throw new Error('A gallery needs at least one image.');
    for (const image of project.images || []) {
      for (const field of ['alt', 'label', 'caption']) text(image[field], `${project.id} image ${field}`);
      richText(image.caption);
      if (!/^assets\/images\/[a-z0-9-]+\.jpg$/.test(image.src)) throw new Error(`Invalid image path: ${image.src}`);
      if (![image.width, image.height].every(n => Number.isInteger(n) && n > 0)) throw new Error(`Invalid dimensions: ${image.src}`);
      if (!image.widths?.length || image.widths.some((n, i) => !Number.isInteger(n) || n <= 0 || n > image.width || (i && n <= image.widths[i-1]))) throw new Error(`Invalid responsive widths: ${image.src}`);
      if (project.id === 'archive') { text(image.kind, 'Record kind'); text(image.year, 'Record year'); }
    }
  }
  for (const row of content.timeline) {
    text(row.date, 'Timeline date'); richText(row.role);
    if (row.illustration && row.illustration !== 'arca') throw new Error('Unknown timeline illustration.');
  }
  for (const item of content.texts) { https(item.url); text(item.title, 'Reading title'); text(item.meta, 'Reading metadata'); }
}

const e = escapeHtml;
const arrow = '<span aria-hidden="true"><svg class="arrow-icon" viewBox="0 0 16 16" focusable="false"><use href="#icon-arrow-ne"></use></svg></span>';
const ongoing = '<span class="ongoing-status"><i aria-hidden="true"></i><span class="ongoing-status__label">Ongoing</span></span>';

export function renderGallery(images) {
  return images.map((image, index) => {
    const stem = image.src.replace('assets/images/', '').replace('.jpg', '');
    const srcset = format => image.widths.map(width => `${format === 'jpg' && width === image.width ? image.src : `assets/images/responsive/${stem}-${width}.${format}`} ${width}w`).join(', ');
    const sizes = '(max-width: 980px) 92vw, 56vw';
    return `<div class="archive-card${image.document ? ' archive-card--document' : ''}" data-archive-card data-archive-label="${e(image.label)}"${image.kind ? ` data-archive-kind="${e(image.kind)}" data-archive-year="${e(image.year)}"` : ''} data-stack-depth="${index}" tabindex="-1"${index ? ' aria-hidden="true"' : ''}>
      <picture class="archive-card__picture">
        <source type="image/avif" srcset="${srcset('avif')}" sizes="${sizes}" />
        <source type="image/webp" srcset="${srcset('webp')}" sizes="${sizes}" />
        <img src="${image.src}" srcset="${srcset('jpg')}" sizes="${sizes}" alt="${e(image.alt)}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async" draggable="false" />
      </picture>
      <p class="archive-card__caption">${richText(image.caption)}</p>
    </div>`;
  }).join('\n');
}

export function renderContent(content, arcaSvg) {
  validateContent(content);
  const blocks = {
    hero: `<p class="hero__statement">${e(content.hero)}</p>`,
    practice: `<h2 id="practice-title" data-reveal>${e(content.practice.title)}</h2>\n<p class="practice-statement__note" data-reveal>${e(content.practice.note)}</p>`,
    'about-intro': `<div class="about__intro"><h2 id="about-title" data-reveal>${e(content.about.title)}</h2><p data-reveal>${e(content.about.introduction)}</p></div>`,
    biography: content.about.paragraphs.map(p => `<p>${richText(p)}</p>`).join('\n'),
    timeline: content.timeline.map(row => `<li${row.illustration ? ' class="timeline__item--arca"' : ''}><span class="timeline__date"><time${/^\d{4}$/.test(row.date) ? ` datetime="${row.date}"` : ''}>${e(row.date)}</time>${row.ongoing ? ongoing : ''}</span><span class="timeline__role">${richText(row.role)}</span>${row.illustration ? arcaSvg : ''}</li>`).join('\n'),
    texts: content.texts.map(item => `<a data-reveal href="${e(item.url)}"><span class="texts__meta">${e(item.meta)}</span><strong>${e(item.title)}</strong><span class="texts__arrow">${arrow}</span></a>`).join('\n'),
  };
  content.projects.forEach((project, index) => {
    blocks[`project-heading-${project.id}`] = `<header class="project__heading" data-reveal>
      <div class="project__count">${String(index+1).padStart(2,'0')}</div>
      <p class="project__type">${e(project.type)}</p>
      <h3><a href="${e(project.url)}" data-analytics-goal="project_open" data-project="${project.id}">${e(project.title)}</a></h3>
      <p class="project__years">${project.since ? `<span>Since ${e(project.since)}</span>${ongoing}` : e(project.date)}</p>
    </header>`;
    blocks[`project-${project.id}`] = `<div class="project__information" data-reveal>
      <p class="project__description">${richText(project.description)}</p>
      ${project.publication ? `<div class="project__publication"><span class="project__publication-label">Featured publication</span><p><cite>${e(project.publication.title)}</cite><small>${e(project.publication.subtitle)}</small></p></div>` : ''}
      <a class="text-link" href="${e(project.url)}" data-analytics-goal="project_open" data-project="${project.id}">${e(project.action)}${arrow}</a>
    </div>`;
    if (project.images) {
      blocks[`gallery-${project.id}`] = renderGallery(project.images);
      const item = project.id === 'archive' ? 'record' : 'image';
      blocks[`controls-${project.id}`] = `<figcaption class="archive-stack__instructions" id="${project.id}-stack-instructions">
        <span data-archive-counter aria-hidden="true">01 / ${String(project.images.length).padStart(2, '0')}</span>
        <span class="archive-stack__instruction archive-stack__instruction--desktop">Drag either way&nbsp;· Either arrow advances the stack</span>
        <span class="archive-stack__instruction archive-stack__instruction--touch">Swipe either way</span>
        <button class="archive-next" type="button" data-archive-next aria-label="Next ${item} in ${project.id === 'archive' ? 'the ' : ''}${e(project.title)}">Next ${item}</button>
      </figcaption>`;
    }
  });
  return blocks;
}
