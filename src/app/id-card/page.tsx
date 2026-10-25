import { SparkIdCard } from "@/components/ui/spark-id-card";

const checkerboard = {
  backgroundColor: "#161616",
  backgroundImage:
    "conic-gradient(#202020 25%, #161616 0 50%, #202020 0 75%, #161616 0)",
  backgroundSize: "26px 26px",
};

export default function IdCardPreviewPage() {
  return (
    <main className="h-screen w-full overflow-auto bg-neutral-950 text-white">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-9 px-6 py-10 md:px-10">
        <header className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.32em] text-white/40">
            Component preview
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Spark ID Card
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Card and lanyard only. White particle strokes on a transparent
            canvas — no background, rain, or ground.
          </p>
        </header>

        <div className="flex flex-wrap items-start gap-8">
          <figure className="w-full max-w-[260px] shrink-0">
            <div
              className="rounded-2xl border border-white/10"
              style={checkerboard}
            >
              <SparkIdCard />
            </div>
            <figcaption className="mt-3 text-xs text-white/40">
              Checkerboard shows the transparent canvas
            </figcaption>
          </figure>

          <figure className="w-full max-w-[190px] shrink-0">
            <div className="rounded-2xl border border-white/10 bg-neutral-900">
              <SparkIdCard />
            </div>
            <figcaption className="mt-3 text-xs text-white/40">
              Smaller size, same composition
            </figcaption>
          </figure>

          <figure className="w-full max-w-[210px] shrink-0">
            <div className="rounded-2xl border border-white/10 bg-black">
              <SparkIdCard name="Ada Lovelace" />
            </div>
            <figcaption className="mt-3 text-xs text-white/40">
              `name` prop, fixed layout
            </figcaption>
          </figure>
        </div>
      </div>
    </main>
  );
}
