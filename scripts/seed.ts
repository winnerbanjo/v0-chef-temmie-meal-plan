import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { products } from "../lib/db/schema";

async function seed() {
    console.log("Seeding database...");

    const productData = {
        title: "Chef Temmie Student Meal Plan",
        slug: "chef-temmie-student-meal-plan",
        description:
            "A digital student meal plan created by Chef Temmie to help students plan simple, affordable meals.",
        price: 0,
        currency: "USD",
        imageUrl: "/meal-plan-cover.png",
        fileUrl: null,
        isActive: true,
    };

    const existingProduct = await db
        .select()
        .from(products)
        .where(eq(products.slug, productData.slug))
        .limit(1);

    if (existingProduct.length > 0) {
        await db
            .update(products)
            .set({
                title: productData.title,
                description: productData.description,
                price: productData.price,
                currency: productData.currency,
                imageUrl: productData.imageUrl,
                fileUrl: productData.fileUrl,
                isActive: productData.isActive,
                updatedAt: new Date(),
            })
            .where(eq(products.slug, productData.slug));

        console.log("Product already existed. Updated product.");
    } else {
        await db.insert(products).values(productData);

        console.log("Product created successfully.");
    }

    console.log("Seeding complete.");
}

seed()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await pool.end();
    });