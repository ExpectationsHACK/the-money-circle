import { all } from "@/lib/db";

export type Testimonial = {
  id: string;
  name: string;
  /** e.g. "Billionaire Circle · Lagos" */
  detail: string;
  quote: string;
  /** Optional headline result, e.g. "Saved ₦1.2m in 6 months". */
  highlight: string;
  published: number;
  sort: number;
};

export async function listTestimonials(opts: { publishedOnly?: boolean } = {}): Promise<Testimonial[]> {
  return all<Testimonial>(
    `SELECT id, name, detail, quote, highlight, published, sort FROM testimonials ${opts.publishedOnly ? "WHERE published = 1" : ""} ORDER BY sort, rowid`,
  );
}

/** For public pages: never let a database hiccup take the homepage down. */
export async function publishedTestimonials(): Promise<Testimonial[]> {
  try {
    return await listTestimonials({ publishedOnly: true });
  } catch (e) {
    console.error("[testimonials] could not load", e);
    return [];
  }
}
