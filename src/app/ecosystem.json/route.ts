export const dynamic = "force-static";

export function GET() {
  return Response.json({
    schemaVersion: 1,
    name: "Aussy SOS",
    type: "SoftwareApplication",
    canonical: "https://aussysos.volponi.tech/",
    creator: "https://volponi.tech",
    publisher: "AIX8C",
    parentEcosystem: "Ecossistema AUSSY AI",
    ecosystemHub: "https://volponi.tech/hub",
    publicCase: "https://volponi.tech/projects/aussy",
    relationship: "Aussy SOS -> Ecossistema AUSSY AI -> AIX8C -> Lorenza Volponi",
    discovery: {
      hub: "https://volponi.tech/hub",
      ecosystem: "https://volponi.tech/ecosystem.json",
      feed: "https://volponi.tech/feed.xml"
    }
  }, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Robots-Tag": "index, follow"
    }
  });
}
