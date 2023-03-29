import {QueryStrategy} from "./queryStrategy";
import {Repository} from "./repositories/repository";
import {Model} from "./data_types/model";
import {Database, OPEN_READWRITE} from "sqlite3";
import {DbHelpers} from "./dbHelpers";
import {ProductCategoryRepository} from "./repositories/categoryRepository";
import {ProductCategory} from "./data_types/productCategory";


// Припустимо, ми маємо таблицю користувачів User (INTEGER id, TEXT name, TEXT email),
// що має фільтруватися або за одним з двох описових атрибутів, або за обома одразу.

// Визначимо data class, який репрезентуватиме рядок у таблиці. Він має наслідувати клас Model.
class User extends Model {
    public readonly id: number;
    public readonly name: string;
    public readonly email: string;

    // Для зручності та консистентності безіменний конструктор приймає список аргументів у тому самому порядку, як вони
    // приходять з бази даних.
    constructor(values: [number, string, string]) {
        super(values);
        [this.id, this.name, this.email] = values;
    }

    // Має повернути первинний ключ. Використовується в UPDATE-виразах.
    primaryKey(): unknown {
        return this.id;
    }

    // Має повертати список всіх аргументів у порядку, в якому їх має бути вставлено в базу даних в INSERT-виразі.
    insertValues(): unknown[] {
        return [this.name, this.email];
    }
}

// Тепер визначимо стратегію побудови запитів
const userQueryStrategy: QueryStrategy = {
    selectStrategy: {
        baseClause:
            'SELECT id, name, email ' +
            'FROM User',
        filteringStrategy: {
            filteringClause:
            // Поле, яке визначає вираз фільтрації за всіма полями водночас. Обов'язково має бути в об'єкті
                'WHERE name = ? AND email = ?',
            emailFilteringClause:
            // Поля, що визначають запити з фільтрацією за окремими полями.
            // Відповідне поле в параметрах запиту, що визначатиме, чи застосовувати конкретно цей вираз,
            // називатиметься isAgeFiltering
                'WHERE email = ?',
            nameFilteringClause:
            // Відповідне поле в параметрах запиту називатиметься isNameFiltering
                'WHERE name = ?',
        },
        singleRowFilterClause: 'WHERE id = ?',
        sortingClause:
            'ORDER BY name DESC'
    },
    deleteStrategy:
        'DELETE FROM User ' +
        'WHERE id = ?',
    updateStrategy:
        'UPDATE User ' +
        'SET name = ?, email = ? ' +
        'WHERE id = ?',
    insertStrategy:
        'INSERT INTO User (name, email) ' +
        'VALUES (?, ?)',
};

// Далі створимо конкретний репозиторій, який працюватиме з типом User
class UserRepository extends Repository<User> {
    constructor(db: Database) {
        // Передаємо новостворену стратегію в конструктор батьківського класу
        super(db, userQueryStrategy);
    }

    // Визначаємо метод castToModel, який створюватиме об'єкт data class зі списку - рядка таблиці
    protected castToModel(row: unknown[]): User {
        return new User(row as [number, string, string]);
    }
}


// Приклад використання; не запуститься, бо в нас немає таких таблиць
async function test(): Promise<void> {
    const db = await DbHelpers.openDB('', OPEN_READWRITE);
    const repo = new UserRepository(db);

    let user = new User([-1, 'Artem', 'mail@example.com']);
    await repo.insert(user);
    user = await repo.selectFirst({
        isSorting: false,
        // фільтруємо по полю email
        isEmailFiltering: true, // це можливо, бо ми визначили поле з назвою `emailFilteringClause` в стратегії побудови запитів
        // знаходимо користувачів з такими значеннями, як в новоствореного користувача
        params: [user.email]
    });
}

// Приклад на справжньому репозиторії категорій продуктів
export async function testCategories(): Promise<void> {
    // create categories repository
    // db should be in READWRITE mode to use modifying queries
    const repo = new ProductCategoryRepository(await DbHelpers.openDB("", OPEN_READWRITE));

    // insert new category
    // await repo.insert(new ProductCategory([null, 'Foods']));

    // select all categories
    console.log('after insertion:', await repo.select());

    // search for a category name
    const category = await repo.selectFirst({isSorting: false, isFiltering: true, params: ['Foods']});
    console.log('found category', category);

    // update a name of the category. I copy the `category` object id and set different name property.
    const changedCategory = new ProductCategory([category.categoryNumber, 'A new category']);
    // when updating, the row must contain the primary key. All other values will be overwritten with the values from this object.
    await repo.update(changedCategory);
    console.log(await repo.select());

    // delete the inserted category
    await repo.delete(category.primaryKey());
    console.log('after deletion', await repo.select());
}