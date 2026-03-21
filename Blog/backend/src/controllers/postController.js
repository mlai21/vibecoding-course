import {
  createPost,
  findPostById,
  queryPosts,
  removePost,
  updatePost,
} from '../services/postService.js';

export async function listPostController(req, res) {
  const result = await queryPosts(req.query);
  res.status(200).json({ success: true, data: result });
}

export async function getPostController(req, res) {
  const post = await findPostById(req.params.id);
  res.status(200).json({ success: true, data: post });
}

export async function createPostController(req, res) {
  const post = await createPost(req.body);
  res.status(201).json({ success: true, data: post });
}

export async function updatePostController(req, res) {
  const post = await updatePost(req.params.id, req.body);
  res.status(200).json({ success: true, data: post });
}

export async function deletePostController(req, res) {
  await removePost(req.params.id);
  res.status(204).send();
}
