-- AlterTable
ALTER TABLE "stories" ALTER COLUMN "media_url" DROP NOT NULL;
ALTER TABLE "stories" ADD COLUMN "text_content" TEXT;
ALTER TABLE "stories" ADD COLUMN "background_color" TEXT;
ALTER TABLE "stories" ADD COLUMN "duration" INTEGER;
