import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string(),
    summary: z.string(),
    tags: z.array(z.string()).optional(),
    featuredProject: z
      .object({
        title: z.string(),
        slug: z.string(),
        description: z.string().optional(),
      })
      .optional(),
  }),
});

const projectsCollection = defineCollection({
  type: 'content',
  schema: z.object({}).passthrough(),
});

export const collections = {
  blog: blogCollection,
  projects: projectsCollection,
};
