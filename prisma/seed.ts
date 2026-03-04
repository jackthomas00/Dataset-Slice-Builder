import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/slicebuilder";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  let dataset = await prisma.dataset.findFirst({
    where: { roboflowProjectId: "demo" },
  });

  if (!dataset) {
    dataset = await prisma.dataset.create({
      data: {
        name: "Demo Dataset",
        source: "roboflow",
        roboflowProjectId: "demo",
        workspaceId: "demo",
      },
    });
  }

  const tag1 = await prisma.tag.upsert({
    where: { name: "outdoor" },
    create: { name: "outdoor" },
    update: {},
  });

  const tag2 = await prisma.tag.upsert({
    where: { name: "indoor" },
    create: { name: "indoor" },
    update: {},
  });

  const existingImages = await prisma.image.count({
    where: { datasetId: dataset.id },
  });

  if (existingImages > 0) {
    console.log("Demo dataset already has images, skipping seed");
    return;
  }

  for (let i = 0; i < 12; i++) {
    const hour = (i * 2) % 24;
    const capturedAt = new Date();
    capturedAt.setUTCHours(hour, 0, 0, 0);

    const image = await prisma.image.create({
      data: {
        datasetId: dataset.id,
        roboflowImageId: `demo-${i}`,
        url: `https://picsum.photos/seed/${i}/400/400`,
        width: 400,
        height: 400,
        capturedAt,
        hourOfDay: hour,
        gpsLat: i % 2 === 0 ? 40.7 + i * 0.01 : null,
        gpsLng: i % 2 === 0 ? -74.0 + i * 0.01 : null,
        split: i % 3 === 0 ? "train" : i % 3 === 1 ? "valid" : "test",
      },
    });

    await prisma.annotationSummary.create({
      data: {
        imageId: image.id,
        hasAnnotations: i % 2 === 0,
        classesJson: JSON.stringify(i % 2 === 0 ? ["object"] : []),
        annotationType: i % 2 === 0 ? "bbox" : null,
      },
    });

    await prisma.imageTag.create({
      data: {
        imageId: image.id,
        tagId: i % 2 === 0 ? tag1.id : tag2.id,
      },
    });
  }

  console.log("Seeded demo dataset with 12 images");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
