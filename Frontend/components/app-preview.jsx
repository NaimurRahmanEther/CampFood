import Image from "next/image";
const previews = [
    {
        label: "Dashboard",
        image: "/images/app-dashboard.jpg",
        description: "Browse menus, trending items, and personalized picks.",
    },
    {
        label: "AI Chat",
        image: "/images/app-ai-chat.jpg",
        description: "Get smart food suggestions from our AI assistant.",
    },
];
export function AppPreview() {
    return (<section id="app-preview" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            See It In Action
          </p>
          <h2 className="mt-3 text-balance font-mono text-3xl font-bold text-foreground md:text-4xl">
            App Preview
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            A sneak peek at the CampFood experience.
          </p>
        </div>

        <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          {previews.map((preview) => (<div key={preview.label} className="group flex flex-col items-center">
              <div className="relative w-full max-w-[260px] overflow-hidden rounded-[2rem] border-4 border-foreground/10 bg-foreground/5 shadow-xl transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-2">
                {/* Phone notch */}
                <div className="absolute top-0 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rounded-b-xl bg-foreground/10"/>
                <Image src={preview.image} alt={`${preview.label} screen preview`} width={260} height={462} className="w-full object-cover"/>
              </div>
              <h3 className="mt-6 text-lg font-bold font-mono text-foreground">
                {preview.label}
              </h3>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                {preview.description}
              </p>
            </div>))}
        </div>
      </div>
    </section>);
}
