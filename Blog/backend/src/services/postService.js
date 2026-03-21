import { POST_STATUS } from '../constants/postStatus.js';
import {
  createPost as createPostInRepo,
  deletePostById,
  getPostById,
  listPosts,
  updatePostById,
} from '../repositories/postRepository.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { createId } from '../utils/id.js';
import { paginate, parsePage } from '../utils/pagination.js';
import { validateCreatePost, validateUpdatePost } from '../validators/postValidator.js';

function toSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export async function queryPosts(query) {
  const { page, pageSize } = parsePage(query.page, query.pageSize);
  const search = query.search?.trim()?.toLowerCase() || '';
  const tag = query.tag?.trim()?.toLowerCase() || '';
  const status = query.status?.trim() || '';
  const sortBy = ['createdAt', 'updatedAt', 'title'].includes(query.sortBy) ? query.sortBy : 'createdAt';
  const order = query.order === 'asc' ? 'asc' : 'desc';

  const posts = await listPosts();

  let filtered = posts;

  if (search) {
    filtered = filtered.filter((post) => {
      const target = `${post.title} ${post.excerpt} ${post.content}`.toLowerCase();
      return target.includes(search);
    });
  }

  if (tag) {
    filtered = filtered.filter((post) => post.tags.some((item) => item.toLowerCase() === tag));
  }

  if (status) {
    filtered = filtered.filter((post) => post.status === status);
  }

  filtered.sort((a, b) => {
    const left = a[sortBy];
    const right = b[sortBy];

    if (sortBy === 'title') {
      return order === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
    }

    return order === 'asc'
      ? new Date(left).getTime() - new Date(right).getTime()
      : new Date(right).getTime() - new Date(left).getTime();
  });

  return paginate(filtered, page, pageSize);
}

export async function findPostById(id) {
  const post = await getPostById(id);

  if (!post) {
    throw notFound('Post not found');
  }

  return post;
}

export async function createPost(payload) {
  const parsed = validateCreatePost(payload);

  if (!parsed.valid) {
    throw badRequest('Invalid post payload', parsed.errors);
  }

  const now = new Date().toISOString();
  const post = {
    id: createId(),
    slug: toSlug(parsed.value.title),
    title: parsed.value.title,
    excerpt: parsed.value.excerpt,
    content: parsed.value.content,
    tags: parsed.value.tags,
    status: parsed.value.status,
    createdAt: now,
    updatedAt: now,
    publishedAt: parsed.value.status === POST_STATUS.PUBLISHED ? now : null,
  };

  return createPostInRepo(post);
}

export async function updatePost(id, payload) {
  const parsed = validateUpdatePost(payload);

  if (!parsed.valid) {
    throw badRequest('Invalid post payload', parsed.errors);
  }

  const existing = await getPostById(id);

  if (!existing) {
    throw notFound('Post not found');
  }

  const nextStatus = parsed.value.status || existing.status;
  const now = new Date().toISOString();

  const patch = {
    ...parsed.value,
    updatedAt: now,
  };

  if (parsed.value.title) {
    patch.slug = toSlug(parsed.value.title);
  }

  if (existing.status !== POST_STATUS.PUBLISHED && nextStatus === POST_STATUS.PUBLISHED) {
    patch.publishedAt = now;
  }

  if (nextStatus === POST_STATUS.DRAFT) {
    patch.publishedAt = null;
  }

  return updatePostById(id, patch);
}

export async function removePost(id) {
  const removed = await deletePostById(id);

  if (!removed) {
    throw notFound('Post not found');
  }
}
