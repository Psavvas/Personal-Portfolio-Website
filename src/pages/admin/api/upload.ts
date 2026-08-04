import type { APIRoute } from 'astro';
import { UTApi } from 'uploadthing/server';

// Uploads images to UploadThing from the admin Markdown editor. Auth is
// enforced by the /admin middleware and re-checked here — an open upload
// endpoint burns someone else's storage quota. The UPLOADTHING_TOKEN env var
// must be set for uploads to work.

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.admin) {
    return json({ error: 'Unauthorized' }, 401);
  }

  if (!process.env.UPLOADTHING_TOKEN?.trim()) {
    return json(
      {
        error:
          'Image uploads are not configured — set the UPLOADTHING_TOKEN environment variable (UploadThing dashboard → API Keys) and redeploy.',
      },
      503
    );
  }

  let files: File[];
  try {
    const form = await request.formData();
    files = form
      .getAll('files')
      .filter((entry): entry is File => entry instanceof File);
  } catch {
    return json({ error: 'Expected a multipart form upload.' }, 400);
  }

  if (files.length === 0) {
    return json({ error: 'No files were included in the upload.' }, 400);
  }

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      return json({ error: `"${file.name}" is not an image.` }, 400);
    }
    if (file.size > MAX_FILE_BYTES) {
      return json({ error: `"${file.name}" is larger than 8 MB.` }, 400);
    }
  }

  try {
    const utapi = new UTApi();
    const results = await utapi.uploadFiles(files);

    const uploaded: Array<{ name: string; url: string }> = [];
    for (const result of results) {
      if (result.error || !result.data) {
        return json(
          {
            error: `Upload failed: ${result.error?.message ?? 'unknown error'}`,
          },
          502
        );
      }
      uploaded.push({
        name: result.data.name,
        url: result.data.ufsUrl ?? result.data.url,
      });
    }

    return json({ files: uploaded });
  } catch (error) {
    console.error('UploadThing upload failed.', error);
    const message = error instanceof Error ? error.message : 'unknown error';
    return json({ error: `Upload failed: ${message}` }, 502);
  }
};
