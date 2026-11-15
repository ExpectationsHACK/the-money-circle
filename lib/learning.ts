import { all, batch, id, now, one } from "./db";
import type { Pillar } from "./packages";

export interface Course {
  id: string;
  slug: string;
  title: string;
  summary: string;
  emoji: string;
  tag: string;
  pillar: number;
  sort: number;
  published: number;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  sort: number;
}

export interface Lesson {
  id: string;
  course_id: string;
  module_id: string;
  slug: string;
  title: string;
  video_url: string | null;
  body: string;
  minutes: number;
  sort: number;
  published: number;
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60) || "untitled"
  );
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listCourses(opts: { publishedOnly?: boolean } = {}): Promise<Course[]> {
  await ensureSeeded();
  return all<Course>(`SELECT * FROM courses ${opts.publishedOnly ? "WHERE published = 1" : ""} ORDER BY sort, created_at`);
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  await ensureSeeded();
  return one<Course>("SELECT * FROM courses WHERE slug = ?", [slug]);
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  return one<Course>("SELECT * FROM courses WHERE id = ?", [courseId]);
}

export async function courseOutline(courseId: string, opts: { publishedOnly?: boolean } = {}) {
  const [modules, lessons] = await Promise.all([
    all<Module>("SELECT * FROM modules WHERE course_id = ? ORDER BY sort, rowid", [courseId]),
    all<Lesson>(
      `SELECT * FROM lessons WHERE course_id = ? ${opts.publishedOnly ? "AND published = 1" : ""} ORDER BY sort, rowid`,
      [courseId],
    ),
  ]);
  const outline = modules.map((m) => ({ ...m, lessons: lessons.filter((l) => l.module_id === m.id) }));
  // Flattened in reading order, for next/previous navigation.
  const ordered = outline.flatMap((m) => m.lessons);
  return { modules: outline, lessons: ordered };
}

export async function completedLessonIds(studentId: string): Promise<Set<string>> {
  const rows = await all<{ lesson_id: string }>("SELECT lesson_id FROM lesson_progress WHERE student_id = ?", [studentId]);
  return new Set(rows.map((r) => r.lesson_id));
}

/** Per-course progress for a student: { courseId: { done, total } } over published lessons. */
export async function progressByCourse(studentId: string): Promise<Record<string, { done: number; total: number }>> {
  const rows = await all<{ course_id: string; total: number; done: number }>(
    `SELECT l.course_id, COUNT(*) total, COUNT(p.lesson_id) done
     FROM lessons l LEFT JOIN lesson_progress p ON p.lesson_id = l.id AND p.student_id = ?
     WHERE l.published = 1 GROUP BY l.course_id`,
    [studentId],
  );
  return Object.fromEntries(rows.map((r) => [r.course_id, { done: Number(r.done), total: Number(r.total) }]));
}

/** The next unfinished lesson in the course the student most recently touched. */
export async function continueLearning(studentId: string, pillars: Pillar[]) {
  const recent = await one<{ course_id: string }>(
    `SELECT l.course_id FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id
     WHERE p.student_id = ? ORDER BY p.completed_at DESC LIMIT 1`,
    [studentId],
  );
  const courses = (await listCourses({ publishedOnly: true })).filter((c) => pillars.includes(c.pillar as Pillar));
  const ordered = recent ? [...courses].sort((a, b) => Number(b.id === recent.course_id) - Number(a.id === recent.course_id)) : courses;
  const done = await completedLessonIds(studentId);
  for (const c of ordered) {
    const { lessons } = await courseOutline(c.id, { publishedOnly: true });
    const next = lessons.find((l) => !done.has(l.id));
    if (next) {
      const finished = lessons.filter((l) => done.has(l.id)).length;
      return { course: c, lesson: next, done: finished, total: lessons.length };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Video embeds (only trusted hosts are ever put in an iframe)
// ---------------------------------------------------------------------------

export function embedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
  if (host.endsWith("youtube.com")) {
    const v = u.searchParams.get("v") ?? u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]+)/)?.[1];
    return v ? `https://www.youtube-nocookie.com/embed/${v}` : null;
  }
  if (host === "vimeo.com") {
    const v = u.pathname.match(/\/(\d+)/)?.[1];
    return v ? `https://player.vimeo.com/video/${v}` : null;
  }
  if (host === "player.vimeo.com") return u.toString();
  if (host === "loom.com") {
    const v = u.pathname.match(/\/(?:share|embed)\/([\w-]+)/)?.[1];
    return v ? `https://www.loom.com/embed/${v}` : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Starter catalogue — inserted once when the courses table is empty.
// Edit or replace everything from /admin/courses.
// ---------------------------------------------------------------------------

type SeedLesson = { title: string; minutes: number; body: string };
type SeedCourse = { title: string; emoji: string; tag: string; pillar: Pillar; summary: string; modules: { title: string; lessons: SeedLesson[] }[] };

const STARTER: SeedCourse[] = [
  {
    title: "Budgeting 101",
    emoji: "🧮",
    tag: "Start here",
    pillar: 1,
    summary: "Give every naira a job before the month starts, using a system built for Nigerian realities.",
    modules: [
      {
        title: "Foundations",
        lessons: [
          {
            title: "Why your salary disappears",
            minutes: 6,
            body: `Most people don't have an income problem first. They have a **plan** problem.\n\nWhen money lands without a plan, it gets spent by whoever shouts loudest: the landlord, the owambe group chat, the cousin with an emergency.\n\n## The fix\n\nDecide what every naira will do *before* payday. That's all a budget is: a plan, not a punishment.\n\n- Write your take-home pay\n- List what must be paid this month\n- Decide what's left for wants and for future you\n\n> A budget is telling your money where to go instead of wondering where it went.`,
          },
          {
            title: "The 50/30/20 rule, Naija edition",
            minutes: 8,
            body: `A simple starting split for your take-home pay:\n\n- **50% Needs**: rent, food, transport, power and data, family support, tithe\n- **30% Wants**: owambe, eating out, self-care, gadgets\n- **20% Future you**: savings, investments, paying off debt\n\n## Adjust it honestly\n\nIn Lagos, rent alone can eat 40%. That's okay. Shrink *wants* first, never *future you*. Even 10% saved beats 0%.\n\nTry it now: open **Budget** in your app and tap *Suggest 50/30/20*.`,
          },
          {
            title: "Your first zero-based budget",
            minutes: 10,
            body: `Zero-based means income minus planned spending equals **zero**. Every naira has a job.\n\n1. Enter your monthly take-home in the Budget tab\n2. Fill each category with a planned amount\n3. Keep going until *unassigned* reads ₦0\n\n## Tips\n\n- Budget for irregular costs (school fees, December) monthly\n- Give yourself a small "no-questions" allowance\n- Review on the 1st and the 15th`,
          },
        ],
      },
    ],
  },
  {
    title: "Money Mindset Rewiring",
    emoji: "🧠",
    tag: "Mindset",
    pillar: 1,
    summary: "Unlearn the scarcity scripts and the black-tax guilt, and build a calm, confident relationship with money.",
    modules: [
      {
        title: "Your money story",
        lessons: [
          {
            title: "Where your money beliefs came from",
            minutes: 7,
            body: `Before age 10, most of us already learned money rules by watching:\n\n- "Money is the root of all evil"\n- "We can't afford it" (said with shame)\n- "Spend it before it finishes"\n\n## Exercise\n\nWrite down three things you heard about money growing up. Next to each, write whether it **helps** or **hurts** you today.`,
          },
          {
            title: "Black tax without the guilt",
            minutes: 9,
            body: `Supporting family is beautiful, until it becomes unplanned and unlimited.\n\n## Make it a budget line\n\n1. Decide a monthly family-support amount\n2. Put it in the **Family support** category\n3. When it's finished, it's finished, with love\n\n> Planned generosity is sustainable. Unplanned generosity becomes resentment.`,
          },
        ],
      },
    ],
  },
  {
    title: "Debt Relief Roadmap",
    emoji: "📉",
    tag: "Debt",
    pillar: 1,
    summary: "Snowball vs avalanche, negotiating with lenders, and getting off loan apps for good.",
    modules: [
      {
        title: "Getting free",
        lessons: [
          {
            title: "List every debt (yes, all of them)",
            minutes: 6,
            body: `You can't beat what you won't look at. List each debt with:\n\n- Who you owe\n- Balance\n- Interest rate or fees\n- Minimum payment and due date\n\nLoan apps often hide 20 to 40% monthly fees. Write the **real** cost.`,
          },
          {
            title: "Snowball or avalanche?",
            minutes: 8,
            body: `Two proven methods:\n\n- **Snowball**: pay the *smallest balance* first for quick wins and motivation\n- **Avalanche**: pay the *highest interest* first, which saves the most money\n\nPay minimums on everything else, and throw every extra naira at the target. When one is cleared, roll its payment into the next.`,
          },
        ],
      },
    ],
  },
  {
    title: "Investing in Nigeria 101",
    emoji: "📈",
    tag: "Wealth",
    pillar: 3,
    summary: "Money market funds, treasury bills, mutual funds and stocks: what they are and how to start safely.",
    modules: [
      {
        title: "The building blocks",
        lessons: [
          {
            title: "Emergency fund before investing",
            minutes: 5,
            body: `Investing money you might need next month is how people panic-sell at a loss.\n\nBuild **3 to 6 months of needs** in a safe, accessible place first (a money market fund or a savings app). Then invest.`,
          },
          {
            title: "Money market funds and T-bills",
            minutes: 9,
            body: `**Money market funds** pool money into short-term, low-risk instruments. They're liquid and earn more than a savings account.\n\n**Treasury bills** are short-term loans to the Federal Government (91, 182 or 364 days). They're very low risk, and you buy them via your bank or a broker.\n\nBoth are great homes for savings goals that are 6 to 24 months away.`,
          },
          {
            title: "Stocks and mutual funds",
            minutes: 10,
            body: `**Stocks** make you a part-owner of a company (e.g. on the NGX). They carry higher potential returns and higher swings. Think 5+ years.\n\n**Mutual funds** let a professional manager hold a diversified basket for you. They're a good first step into equities.\n\n> Coaching, not advice: we teach how these work and help you build a plan. You decide.`,
          },
        ],
      },
    ],
  },
  {
    title: "From Skill to First Client",
    emoji: "🚀",
    tag: "Earn",
    pillar: 4,
    summary: "Package what you already know into an offer people will pay for this month.",
    modules: [
      {
        title: "Your offer",
        lessons: [
          {
            title: "Pick one skill to sell",
            minutes: 7,
            body: `List skills people already ask you for help with. Circle the one that:\n\n- Solves an urgent problem\n- Someone already pays for (check Instagram and WhatsApp)\n- You can deliver in under 2 weeks\n\nThat's your starting offer. Not forever, just first.`,
          },
          {
            title: "Price it and say it out loud",
            minutes: 8,
            body: `Price on the **result**, not your hours. Write one sentence:\n\n> I help [who] get [result] in [time] for ₦[price].\n\nSay it out loud 10 times today. Then tell 20 people. Track it in your **LaunchPad** roadmap.`,
          },
        ],
      },
    ],
  },
];

let seeding: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  seeding ??= (async () => {
    const has = await one<{ n: number }>("SELECT COUNT(*) n FROM courses");
    if (Number(has?.n ?? 0) > 0) return;
    const t = now();
    const stmts: { sql: string; args: (string | number | null)[] }[] = [];
    STARTER.forEach((c, ci) => {
      const cid = id();
      stmts.push({
        sql: "INSERT OR IGNORE INTO courses (id, slug, title, summary, emoji, tag, pillar, sort, published, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)",
        args: [cid, slugify(c.title), c.title, c.summary, c.emoji, c.tag, c.pillar, ci, t],
      });
      c.modules.forEach((m, mi) => {
        const mid = id();
        stmts.push({ sql: "INSERT INTO modules (id, course_id, title, sort) VALUES (?, ?, ?, ?)", args: [mid, cid, m.title, mi] });
        m.lessons.forEach((l, li) =>
          stmts.push({
            sql: "INSERT INTO lessons (id, course_id, module_id, slug, title, video_url, body, minutes, sort, published) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, 1)",
            args: [id(), cid, mid, slugify(l.title), l.title, l.body, l.minutes, mi * 100 + li],
          }),
        );
      });
    });
    await batch(stmts);
  })().catch((e) => {
    seeding = null;
    throw e;
  });
  return seeding;
}
