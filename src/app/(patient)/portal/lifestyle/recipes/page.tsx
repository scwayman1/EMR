import { PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import {
  RECIPES,
  type Recipe,
  type RecipeCourse,
} from "@/lib/content/recipes";

export const metadata = { title: "Cannabis Kitchen" };

// ---------------------------------------------------------------------------
// EMR-089 — Cannabis-infused recipe library
// A clean, browseable index. Each recipe expands inline to ingredients and
// steps. No JS required to read content — the <details> element does the
// disclosure for us, which keeps the page fast and accessible.
// ---------------------------------------------------------------------------

const COURSE_ORDER: RecipeCourse[] = [
  "breakfast",
  "main",
  "snack",
  "drink",
  "dessert",
];
const COURSE_LABELS: Record<RecipeCourse, string> = {
  breakfast: "Breakfast",
  main: "Mains & bowls",
  snack: "Snacks & pantry",
  drink: "Drinks",
  dessert: "Desserts",
};

export default function RecipesPage() {
  const grouped = COURSE_ORDER.map((course) => ({
    course,
    items: RECIPES.filter((r) => r.course === course),
  })).filter((g) => g.items.length > 0);

  return (
    <PageShell maxWidth="max-w-[1040px]">
      <Card tone="ambient" className="mb-8 grain">
        <div className="relative z-10 px-6 md:px-10 py-8 md:py-12">
          <Eyebrow className="mb-3">Cannabis kitchen</Eyebrow>
          <h1 className="font-display text-3xl md:text-[2.5rem] text-text tracking-tight leading-[1.08]">
            Recipes that pair with your medicine.
          </h1>
          <p className="text-[15px] text-text-muted mt-3 leading-relaxed max-w-xl">
            Anti-inflammatory meals, calming drinks, and a few pantry staples
            that turn a dose into a meal. Always titrate from your prescribed
            regimen — these doses are illustrative only.
          </p>
        </div>
      </Card>

      <Card>
        <CardContent className="py-5 flex flex-wrap gap-2 items-center">
          <Eyebrow className="mr-2 text-text-subtle">Quick filter</Eyebrow>
          {COURSE_ORDER.map((c) => (
            <a
              key={c}
              href={`#${c}`}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:border-accent hover:text-accent transition-colors"
            >
              {COURSE_LABELS[c]}
            </a>
          ))}
        </CardContent>
      </Card>

      {grouped.map((group, idx) => (
        <section key={group.course} id={group.course} className="mt-10">
          <Eyebrow className="mb-4">{COURSE_LABELS[group.course]}</Eyebrow>
          <div className="grid gap-4 md:grid-cols-2">
            {group.items.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
          {idx < grouped.length - 1 && <EditorialRule className="my-10" />}
        </section>
      ))}

      <p className="text-xs text-text-subtle text-center mt-12">
        Always consult your care team before changing your cannabis regimen.
        Doses listed are estimates based on a typical 7g flower → 1 cup oil
        infusion and assume full decarboxylation.
      </p>
    </PageShell>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Card tone="raised">
      <CardContent className="py-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2 className="font-display text-lg text-text leading-snug">
            {recipe.title}
          </h2>
          <Badge tone="accent" className="shrink-0">
            ~{recipe.approxMgPerServing} mg
          </Badge>
        </div>
        <p className="text-sm text-text-muted leading-relaxed">{recipe.blurb}</p>
        <div className="flex flex-wrap gap-2 mt-3 text-[10px] uppercase tracking-[0.14em] text-text-subtle">
          <span>{recipe.prepMinutes + recipe.cookMinutes} min</span>
          <span aria-hidden="true">·</span>
          <span>{recipe.servings} servings</span>
          <span aria-hidden="true">·</span>
          <span>{recipe.difficulty}</span>
          {recipe.diets.map((d) => (
            <Badge key={d} className="text-[9px]">
              {d}
            </Badge>
          ))}
        </div>

        <details className="mt-4 group">
          <summary className="cursor-pointer text-xs font-medium text-accent hover:underline list-none">
            <span className="group-open:hidden">Show ingredients & steps</span>
            <span className="hidden group-open:inline">Hide details</span>
          </summary>

          <div className="mt-4 grid gap-4 md:grid-cols-[200px,1fr]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-2">
                Ingredients
              </p>
              <ul className="space-y-1 text-sm text-text">
                {recipe.ingredients.map((line, i) => (
                  <li key={i} className="leading-snug">
                    • {line}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-2">
                Method
              </p>
              <ol className="space-y-2 text-sm text-text list-decimal list-inside">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="leading-snug">
                    {step}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-accent mt-4">
                Why it helps: {recipe.whyItHelps}
              </p>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
