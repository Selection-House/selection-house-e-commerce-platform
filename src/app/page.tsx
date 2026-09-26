import HomeCatalog from "@/components/home-catalog";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const params = await searchParams;
  return <HomeCatalog initialCategory={params.category || ""} initialQuery={params.q || ""}/>;
}
