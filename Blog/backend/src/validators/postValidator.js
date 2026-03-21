import { POST_STATUS_LIST } from '../constants/postStatus.js';

function isString(value) {
  return typeof value === 'string';
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function normalizeString(value) {
  return isString(value) ? value.trim() : value;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return tags;
  }

  return tags.map((tag) => tag.trim()).filter(Boolean);
}

export function validateCreatePost(payload) {
  const errors = [];
  const title = normalizeString(payload.title);
  const content = normalizeString(payload.content);
  const excerpt = normalizeString(payload.excerpt || '');
  const tags = normalizeTags(payload.tags || []);
  const status = normalizeString(payload.status || 'draft');

  if (!title || !isString(title)) {
    errors.push({ field: 'title', message: 'title is required and must be a non-empty string' });
  }

  if (!content || !isString(content)) {
    errors.push({ field: 'content', message: 'content is required and must be a non-empty string' });
  }

  if (payload.excerpt !== undefined && !isString(excerpt)) {
    errors.push({ field: 'excerpt', message: 'excerpt must be a string' });
  }

  if (!isStringArray(tags)) {
    errors.push({ field: 'tags', message: 'tags must be an array of strings' });
  }

  if (!POST_STATUS_LIST.includes(status)) {
    errors.push({ field: 'status', message: `status must be one of: ${POST_STATUS_LIST.join(', ')}` });
  }

  return {
    valid: errors.length === 0,
    errors,
    value: {
      title,
      content,
      excerpt,
      tags,
      status,
    },
  };
}

export function validateUpdatePost(payload) {
  const errors = [];
  const value = {};

  if (payload.title !== undefined) {
    const title = normalizeString(payload.title);
    if (!title || !isString(title)) {
      errors.push({ field: 'title', message: 'title must be a non-empty string' });
    } else {
      value.title = title;
    }
  }

  if (payload.content !== undefined) {
    const content = normalizeString(payload.content);
    if (!content || !isString(content)) {
      errors.push({ field: 'content', message: 'content must be a non-empty string' });
    } else {
      value.content = content;
    }
  }

  if (payload.excerpt !== undefined) {
    const excerpt = normalizeString(payload.excerpt);
    if (!isString(excerpt)) {
      errors.push({ field: 'excerpt', message: 'excerpt must be a string' });
    } else {
      value.excerpt = excerpt;
    }
  }

  if (payload.tags !== undefined) {
    const tags = normalizeTags(payload.tags);
    if (!isStringArray(tags)) {
      errors.push({ field: 'tags', message: 'tags must be an array of strings' });
    } else {
      value.tags = tags;
    }
  }

  if (payload.status !== undefined) {
    const status = normalizeString(payload.status);
    if (!POST_STATUS_LIST.includes(status)) {
      errors.push({ field: 'status', message: `status must be one of: ${POST_STATUS_LIST.join(', ')}` });
    } else {
      value.status = status;
    }
  }

  if (Object.keys(value).length === 0 && errors.length === 0) {
    errors.push({ field: 'body', message: 'at least one field is required to update the post' });
  }

  return {
    valid: errors.length === 0,
    errors,
    value,
  };
}
