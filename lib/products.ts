import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";

export type Product = typeof products.$inferSelect;

export async function getActiveProduct(): Promise<Product | null> {
  try {
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.slug, "chef-temmie-student-meal-plan"),
          eq(products.isActive, true)
        )
      )
      .limit(1);

    return product ?? null;
  } catch (err) {
    console.log("[v0] getActiveProduct error:", err);
    return null;
  }
}