import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getDbUser } from "@/lib/getDbUser";
import { prisma } from "@/lib/prisma";

const f = createUploadthing();

async function requireUploader() {
  const { user, error } = await getDbUser();
  if (error || !user) throw new UploadThingError("Unauthorized");
  return user;
}

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Post hero images.
  imageUploader: f({
    image: {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const user = await requireUploader();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId };
    }),

  // Profile avatars — separate route from post hero images so avatar
  // uploads are scoped distinctly, and writes straight to User.image.
  avatarUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const user = await requireUploader();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await prisma.user.update({
        where: { id: metadata.userId },
        data: { image: file.ufsUrl },
      });
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
