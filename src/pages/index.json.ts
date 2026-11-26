// A compact index of every published tool, fetched by /tools and used for the
// instant client-side filter. Keep it terse: it is downloaded on every visit.
//
// Row order: slug, name, fullName, category, tagline, stars, state, language,
// pushedAt(YYYY-MM-DD), firstSeen.
import { getTools, daysSincePush } from '../lib/data';

export const prerender = true;

export async function GET() {
  const tools = await getTools();
  const rows = tools.map((t) => [
    t.slug,
    t.name,
    t.fullName,
    t.category,
    t.tagline,
    t.stars,
    t.state,
    t.language,
    t.pushedAt.slice(0, 10),
    t.firstSeen,
    t.verified ? 1 : 0,
  ]);

  return new Response(
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      columns: ['slug', 'name', 'repo', 'category', 'tagline', 'stars', 'state', 'language', 'pushed', 'firstSeen', 'verified'],
      rows,
    }),
    { headers: { 'content-type': 'application/json; charset=utf-8' } },
  );
}
