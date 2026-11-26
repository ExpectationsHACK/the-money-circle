import { listTestimonials } from "@/lib/testimonials";
import { input } from "@/lib/styles";
import { ActionForm, SubmitButton } from "@/components/app/ui";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";
import { deleteTestimonial, moveTestimonial, saveTestimonial, toggleTestimonial } from "../../actions";

export const metadata = { title: "Testimonials" };

function Fields({ t }: { t?: { name: string; detail: string; quote: string; highlight: string } }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-semibold">
        Student’s name
        <input name="name" required maxLength={80} defaultValue={t?.name} placeholder="Ada O." className={`mt-1 ${input} text-sm`} />
      </label>
      <label className="block text-sm font-semibold">
        Detail <span className="font-normal text-muted">(optional)</span>
        <input name="detail" maxLength={120} defaultValue={t?.detail} placeholder="Billionaire Circle · Lagos" className={`mt-1 ${input} text-sm`} />
      </label>
      <label className="block text-sm font-semibold sm:col-span-2">
        What they said
        <textarea name="quote" required rows={4} maxLength={1200} defaultValue={t?.quote} placeholder="Paste their message exactly as they sent it." className={`mt-1 ${input} text-sm`} />
      </label>
      <label className="block text-sm font-semibold sm:col-span-2">
        Headline result <span className="font-normal text-muted">(optional, shown in gold)</span>
        <input name="highlight" maxLength={80} defaultValue={t?.highlight} placeholder="Saved ₦1.2m in 6 months" className={`mt-1 ${input} text-sm`} />
      </label>
    </div>
  );
}

export default async function TestimonialsAdmin() {
  const list = await listTestimonials();
  const live = list.filter((t) => t.published).length;

  return (
    <>
      <PageHeader eyebrow="Website" title="Testimonials">
        <a href="/#testimonials" target="_blank" className="rounded-xl bg-paper px-4 py-2.5 text-sm font-bold ring-1 ring-line hover:bg-cream">View on site ↗</a>
      </PageHeader>
      <p className="-mt-2 text-sm text-muted">
        These appear on the homepage under “Hear from our billionaires”. {live === 0 ? "The section stays hidden until at least one is published." : `${live} live now.`} Only
        post words students agreed to share.
      </p>

      <Panel title="Add a testimonial">
        <ActionForm action={saveTestimonial}>
          <Fields />
          <div className="mt-4">
            <SubmitButton>Publish testimonial</SubmitButton>
          </div>
        </ActionForm>
      </Panel>

      {list.length === 0 ? (
        <Empty>No testimonials yet. Add your first one above.</Empty>
      ) : (
        <ul className="space-y-4">
          {list.map((t, i) => (
            <li key={t.id} className={`rounded-3xl bg-paper p-5 ring-1 ring-line sm:p-6 ${t.published ? "" : "opacity-70"}`}>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${t.published ? "bg-moss/15 text-moss" : "bg-cream text-muted"}`}>
                  {t.published ? "Live" : "Hidden"}
                </span>
                <span className="font-display font-bold">{t.name}</span>
                <div className="ml-auto flex items-center gap-1">
                  <form action={moveTestimonial}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="dir" value="up" />
                    <button disabled={i === 0} aria-label={`Move ${t.name} up`} className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-cream disabled:opacity-20">▲</button>
                  </form>
                  <form action={moveTestimonial}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="dir" value="down" />
                    <button disabled={i === list.length - 1} aria-label={`Move ${t.name} down`} className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-cream disabled:opacity-20">▼</button>
                  </form>
                  <form action={toggleTestimonial}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="rounded-lg px-3 py-1 text-xs font-semibold ring-1 ring-line hover:bg-cream">{t.published ? "Hide" : "Publish"}</button>
                  </form>
                  <form action={deleteTestimonial}>
                    <input type="hidden" name="id" value={t.id} />
                    <button aria-label={`Delete testimonial from ${t.name}`} className="rounded-lg px-3 py-1 text-xs font-semibold text-coral hover:bg-coral/10">Delete</button>
                  </form>
                </div>
              </div>
              <details>
                <summary className="cursor-pointer list-none">
                  <p className="line-clamp-2 text-sm text-muted">“{t.quote}”</p>
                  <span className="mt-2 inline-block text-xs font-semibold text-moss">Edit ▾</span>
                </summary>
                <ActionForm action={saveTestimonial} resetOnSuccess={false} className="mt-4">
                  <input type="hidden" name="id" value={t.id} />
                  <Fields t={t} />
                  <div className="mt-4">
                    <SubmitButton>Save changes</SubmitButton>
                  </div>
                </ActionForm>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
