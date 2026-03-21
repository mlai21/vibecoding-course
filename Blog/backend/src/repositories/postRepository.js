import path from 'node:path';
import { config } from '../config/index.js';
import { readJson, writeJson } from '../utils/fileStore.js';

const POSTS_FILE = path.join(config.dataDir, 'posts.json');

export async function listPosts() {
  return readJson(POSTS_FILE, []);
}

export async function getPostById(id) {
  const posts = await listPosts();
  return posts.find((post) => post.id === id) || null;
}

export async function createPost(post) {
  const posts = await listPosts();
  const nextPosts = [post, ...posts];
  await writeJson(POSTS_FILE, nextPosts);
  return post;
}

export async function updatePostById(id, patch) {
  const posts = await listPosts();
  const index = posts.findIndex((post) => post.id === id);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...posts[index],
    ...patch,
  };

  posts[index] = updated;
  await writeJson(POSTS_FILE, posts);
  return updated;
}

export async function deletePostById(id) {
  const posts = await listPosts();
  const exists = posts.some((post) => post.id === id);

  if (!exists) {
    return false;
  }

  const nextPosts = posts.filter((post) => post.id !== id);
  await writeJson(POSTS_FILE, nextPosts);
  return true;
}
