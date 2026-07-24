// Turns a category name like "Vietnam War" into a URL-friendly slug like "vietnam-war"
function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

module.exports = function (eleventyConfig) {
  // Copy these folders straight into the built site, unchanged
  eleventyConfig.addPassthroughCopy("css");
  // Only top-level files in images/ are published — this deliberately excludes
  // any subfolder (e.g. _originals, or any _<slug>-staging folder used while
  // prepping a new essay's photos) from ever reaching the live site, even if
  // someone forgets to delete a staging folder before publishing.
  eleventyConfig.addPassthroughCopy("images/*.{jpg,jpeg,png,svg,webp,gif}");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("robots.txt");

  // Formats a JS Date as an ISO 8601 string (for sitemaps + structured data)
  eleventyConfig.addFilter("isoDate", (date) => {
    return date instanceof Date ? date.toISOString() : "";
  });

  eleventyConfig.addFilter("slugify", slugify);

  // Groups all objects by their `category` front matter into one entry per
  // category, each with a URL-friendly slug and the list of objects in it.
  // An object can belong to multiple categories (e.g. "Military" and
  // "Vietnam War" at once) just by listing more than one in its front matter.
  eleventyConfig.addCollection("objectCategories", function (collectionApi) {
    const objects = collectionApi.getFilteredByTag("objects");
    const categoryMap = {};

    objects.forEach((item) => {
      const cats = item.data.category || [];
      cats.forEach((cat) => {
        const slug = slugify(cat);
        if (!categoryMap[slug]) {
          categoryMap[slug] = { name: cat, slug, items: [] };
        }
        categoryMap[slug].items.push(item);
      });
    });

    return Object.values(categoryMap).sort((a, b) => a.name.localeCompare(b.name));
  });

  // Groups all objects AND essays by their `tags` front matter into one
  // entry per tag, each with a URL-friendly slug and the list of items
  // (mixed objects/essays) carrying that tag. The "objects"/"essays"
  // collection tags (set in objects.json/essays.json) are excluded since
  // those are internal bookkeeping, not user-facing tags.
  eleventyConfig.addCollection("tagList", function (collectionApi) {
    const items = [
      ...collectionApi.getFilteredByTag("objects"),
      ...collectionApi.getFilteredByTag("essays"),
    ];
    const tagMap = {};

    items.forEach((item) => {
      const tags = (item.data.tags || []).filter(
        (t) => t !== "objects" && t !== "essays"
      );
      tags.forEach((tag) => {
        const slug = slugify(tag);
        if (!tagMap[slug]) {
          tagMap[slug] = { name: tag, slug, items: [] };
        }
        tagMap[slug].items.push(item);
      });
    });

    return Object.values(tagMap).sort((a, b) => a.name.localeCompare(b.name));
  });

  // Filter pills for the /objects/ index page: every unique category AND
  // tag found across objects, merged and deduped by slug (so an object
  // that lists "GWOT" in both category and tags only gets one pill).
  eleventyConfig.addCollection("objectFilters", function (collectionApi) {
    const objects = collectionApi.getFilteredByTag("objects");
    const filterMap = {};

    objects.forEach((item) => {
      const cats = item.data.category || [];
      const tags = (item.data.tags || []).filter(
        (t) => t !== "objects" && t !== "essays"
      );
      [...cats, ...tags].forEach((name) => {
        const slug = slugify(name);
        if (!filterMap[slug]) {
          filterMap[slug] = { name, slug };
        }
      });
    });

    return Object.values(filterMap).sort((a, b) => a.name.localeCompare(b.name));
  });

  // Finds other objects that share at least one tag or category with the
  // current object, ranked by how many they share (ties broken by newest
  // first). Used to render a "Related Objects" section on each object page
  // for internal linking / SEO. Returns at most `limit` items.
  eleventyConfig.addFilter("relatedObjects", function (objects, currentTags, currentCategories, currentUrl, limit) {
    // "objects"/"essays" are internal collection-bookkeeping tags merged in
    // by Eleventy's directory-data tag handling, not real topical tags —
    // exclude them so every object doesn't spuriously "match" every other.
    const isBookkeeping = (t) => t === "objects" || t === "essays";
    const tags = (currentTags || []).filter((t) => !isBookkeeping(t));
    const cats = currentCategories || [];
    const max = limit || 3;

    const scored = objects
      .filter((o) => o.url !== currentUrl)
      .map((o) => {
        const oTags = (o.data.tags || []).filter((t) => !isBookkeeping(t));
        const oCats = o.data.category || [];
        const sharedTags = oTags.filter((t) => tags.includes(t)).length;
        const sharedCats = oCats.filter((c) => cats.includes(c)).length;
        return { item: o, score: sharedTags + sharedCats };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || (b.item.date - a.item.date));

    return scored.slice(0, max).map((entry) => entry.item);
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site"
    }
  };
};
