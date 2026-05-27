# Combo Wheel Expansion Design (EMR-327)

## Overview
Expand the Cannabis Combo Wheel to an 8x8 layout (8 Cannabinoids, 8 Terpenes) driven by the `EducationCompound` table. This replaces the empty default state with a vibrant, medically accurate pharmacopeia.

## Architecture & Data Flow
1. **Database**: `EducationCompound` already exists in `schema.prisma`. It stores compounds, their type, colors, symptoms, benefits, risks, and evidence level.
2. **Seed Data**: We will insert 16 compounds into `prisma/seed.ts`.
   - **Cannabinoids (8)**: THC, CBD, CBG, CBN, CBC, THCV, CBDa, THCa.
   - **Terpenes (8)**: Myrcene, Limonene, Caryophyllene, Linalool, Pinene, Humulene, Terpinolene, Ocimene.
3. **Visuals**: The `ComboWheel.tsx` SVG dynamically sizes slices based on `list.length`. The math naturally supports `N=8` without overlapping, maintaining high touch legibility.

## Seed Function
We will append a `seedEducationCompounds` function to `prisma/seed.ts`. It will iterate through the 16 compounds and `upsert` them to ensure idempotency. The wheel relies on the `sortOrder` to group them predictably.

## Error Handling & Edge Cases
- **Duplicate Seeds**: Uses `prisma.educationCompound.upsert` based on the stable slug `id`.
- **Empty State Fallback**: `ComboWheel.tsx` handles empty sets gracefully, but the seed ensures all local and test environments have the data.

## Implementation Steps
1. Append `seedEducationCompounds` array and logic to `prisma/seed.ts`.
2. Ensure it gets called inside the main `main()`/`seed()` block.
3. Verify the `ComboWheel` renders correctly.
