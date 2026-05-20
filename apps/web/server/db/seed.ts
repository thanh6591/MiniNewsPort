import { desc, eq } from "drizzle-orm";
import { db } from "./client";
import { categories, news, newsViewDaily } from "./schema";

function makeSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

type CategorySeedConfig = {
  name: string;
  slug: string;
  topics: string[];
  imageKeyword: string;
};

const categorySeeds: CategorySeedConfig[] = [
  {
    name: "Politics",
    slug: "politics",
    topics: ["policy reform", "parliament debate", "election strategy", "public governance", "civic budget"],
    imageKeyword: "government"
  },
  {
    name: "Business",
    slug: "business",
    topics: ["market expansion", "startup funding", "supply chain", "consumer demand", "quarterly growth"],
    imageKeyword: "finance"
  },
  {
    name: "Technology",
    slug: "technology",
    topics: ["ai rollout", "cloud security", "developer platform", "chip innovation", "automation tooling"],
    imageKeyword: "technology"
  },
  {
    name: "Lifestyle",
    slug: "lifestyle",
    topics: ["wellness routine", "home productivity", "travel planning", "food culture", "work-life balance"],
    imageKeyword: "lifestyle"
  }
];

const postsPerCategory: Record<string, number> = {
  business: 100
};

function buildCategoryPost(config: CategorySeedConfig, itemNumber: number, categoryId: number, sequence: number): typeof news.$inferInsert {
  const topic = config.topics[(itemNumber - 1) % config.topics.length];
  const title = `${config.name}: ${topic} insight #${itemNumber}`;
  const summary = `A ${config.name.toLowerCase()} brief on ${topic} with practical context and key takeaways.`;
  const content = [
    `${title} focuses on how ${topic} is shaping current ${config.name.toLowerCase()} conversations.`,
    `The report highlights recent developments, measurable outcomes, and the next likely direction for stakeholders.`,
    `Readers can use these points to understand momentum, evaluate trade-offs, and track follow-up events in the category.`
  ].join("\n\n");

  return {
    title,
    slug: makeSlug(`${config.slug}-${topic}-${itemNumber}`),
    summary,
    content,
    imageUrl: `https://picsum.photos/seed/${config.imageKeyword}-${itemNumber}/1200/675`,
    status: "PUBLISHED",
    publishedAt: hoursAgo(sequence),
    viewCount: 120 - (itemNumber % 25) + sequence,
    categoryId,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

async function seed() {
  // Reset sample content so each run produces a deterministic dataset.
  await db.delete(newsViewDaily);
  await db.delete(news);
  await db.delete(categories);

  const now = new Date();
  await db.insert(categories).values(
    categorySeeds.map((item) => ({
      name: item.name,
      slug: item.slug,
      createdAt: now,
      updatedAt: now
    }))
  );

  const allCategories: Array<typeof categories.$inferSelect> = await db
    .select()
    .from(categories)
    .orderBy(categories.id);
  const categoryIdBySlug = new Map<string, number>(allCategories.map((item) => [item.slug, item.id]));

  let sequence = 0;
  const newsRows: Array<typeof news.$inferInsert> = [];
  const seededCounts: Array<{ slug: string; count: number }> = [];

  for (const category of categorySeeds) {
    const categoryId = categoryIdBySlug.get(category.slug);

    if (!categoryId) {
      throw new Error(`Category not found after seeding: ${category.slug}`);
    }

    const postsToCreate = postsPerCategory[category.slug] ?? 30;
    seededCounts.push({ slug: category.slug, count: postsToCreate });

    for (let i = 1; i <= postsToCreate; i += 1) {
      sequence += 1;
      newsRows.push(buildCategoryPost(category, i, categoryId, sequence));
    }
  }

  await db.insert(news).values(newsRows);

  const publishedNews: Array<{ id: number; publishedAt: Date | null }> = await db
    .select({ id: news.id, publishedAt: news.publishedAt })
    .from(news)
    .where(eq(news.status, "PUBLISHED"))
    .orderBy(desc(news.publishedAt));

  const today = new Date();
  const todayValue = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;

  await db.insert(newsViewDaily).values(
    publishedNews.slice(0, 24).map((row, index) => ({
      newsId: row.id,
      viewDate: todayValue,
      viewCount: 120 - index * 3
    }))
  );

  const seededSummary = seededCounts.map((item) => `${item.slug}:${item.count}`).join(", ");
  console.log(`Seed completed: ${allCategories.length} categories, ${publishedNews.length} published posts (${seededSummary}).`);
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
