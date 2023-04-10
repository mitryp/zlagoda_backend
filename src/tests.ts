import { OPEN_READWRITE } from "sqlite3";
import { DbHelpers } from "./model/dbHelpers";
import { CategoryRepository } from "./model/repositories/categoryRepository";

export async function testCategories(): Promise<void> {
    // create categories repository
    // db should be in READWRITE mode to use modifying queries
    const repo = new CategoryRepository(await DbHelpers.openDB("", OPEN_READWRITE));

    // insert new category
    await repo.insert({ categoryNumber: null, categoryName: "Dairy" });
    await repo.insert({ categoryNumber: null, categoryName: "Vegetables" });

    // select all categories
    console.log("after insertion:", await repo.select());

    // search for a category name
    const category = await repo.selectFirst({ filters: ["nameFilter"], filtersParams: ["Dairy"] });
    console.log("found category", category);

    await repo.update(category.categoryNumber, { categoryNumber: category.categoryNumber, categoryName: "Not Dairy Anymore" });
    console.log("after updating:", await repo.select());

    // delete the inserted category
    await repo.delete(category.categoryNumber);
    console.log("after deletion", await repo.select());
}
