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
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    tags: z.array(z.string()),
    year: z.union([z.string(), z.array(z.string())]).optional(),
    links: z
      .array(
        z.object({
          label: z.string(),
          href: z.string(),
          primary: z.boolean().optional(),
        })
      )
      .optional(),
    featuredPost: z
      .object({
        title: z.string(),
        slug: z.string(),
        description: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = {
  blog: blogCollection,
  projects: projectsCollection,
};
