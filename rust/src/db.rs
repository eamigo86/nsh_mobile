//! The SQL behind the `Db` module: plain functions over a `rusqlite::Connection`, so the unit tests run on `:memory:`.
//! Ids are integers in SQLite and strings at the TSX boundary.

use rusqlite::Connection;

/// A category as TSX sees it.
#[derive(Clone, Debug, PartialEq, nsh_core::prelude::JsObject)]
pub struct CategoryRow {
    pub id: String,
    pub name: String,
    pub color: String,
}

/// A task as TSX sees it. `category_id` is `categoryId` there.
#[derive(Clone, Debug, PartialEq, nsh_core::prelude::JsObject)]
pub struct TaskRow {
    pub id: String,
    pub title: String,
    pub notes: String,
    pub category_id: String,
    pub due: String,
    pub time: String,
    pub done: bool,
}

/// Opens (creating the directory, the file and the tables) `dir/todo.sqlite`.
pub fn open_in(dir: &str) -> Result<Connection, String> {
    if dir.is_empty() {
        return Err("this platform keeps no data directory".into());
    }
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let conn = Connection::open(std::path::Path::new(dir).join("todo.sqlite")).map_err(err)?;
    init(&conn)?;
    Ok(conn)
}

const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    color TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    category_id TEXT NOT NULL DEFAULT '',
    due TEXT NOT NULL DEFAULT '',
    time TEXT NOT NULL DEFAULT '',
    done INTEGER NOT NULL DEFAULT 0
);";

fn err(e: rusqlite::Error) -> String {
    e.to_string()
}

fn int(id: &str) -> Result<i64, String> {
    id.parse().map_err(|_| format!("bad id: {id}"))
}

/// Creates the tables when they are missing.
pub fn init(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(SCHEMA).map_err(err)
}

/// `PRAGMA user_version`: 0 until the first import, then 1.
pub fn version(conn: &Connection) -> Result<u32, String> {
    conn.pragma_query_value(None, "user_version", |r| r.get(0)).map_err(err)
}

pub fn categories(conn: &Connection) -> Result<Vec<CategoryRow>, String> {
    let mut stmt = conn.prepare("SELECT id, name, color FROM categories ORDER BY id").map_err(err)?;
    let rows = stmt
        .query_map([], |r| Ok(CategoryRow { id: r.get::<_, i64>(0)?.to_string(), name: r.get(1)?, color: r.get(2)? }))
        .map_err(err)?;
    rows.collect::<Result<_, _>>().map_err(err)
}

pub fn tasks(conn: &Connection) -> Result<Vec<TaskRow>, String> {
    let mut stmt = conn.prepare("SELECT id, title, notes, category_id, due, time, done FROM tasks ORDER BY id").map_err(err)?;
    let rows = stmt
        .query_map([], |r| {
            Ok(TaskRow {
                id: r.get::<_, i64>(0)?.to_string(),
                title: r.get(1)?,
                notes: r.get(2)?,
                category_id: r.get(3)?,
                due: r.get(4)?,
                time: r.get(5)?,
                done: r.get(6)?,
            })
        })
        .map_err(err)?;
    rows.collect::<Result<_, _>>().map_err(err)
}

const UPSERT: &str = "INSERT INTO tasks (id, title, notes, category_id, due, time, done) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    ON CONFLICT(id) DO UPDATE SET title = ?2, notes = ?3, category_id = ?4, due = ?5, time = ?6";

/// Inserts a task (`id` empty: SQLite picks the id) or updates the one with that id, leaving its `done` as it is.
/// Returns the id.
pub fn save_task(conn: &Connection, t: &TaskRow) -> Result<String, String> {
    let id = if t.id.is_empty() { None } else { Some(int(&t.id)?) };
    conn.execute(UPSERT, rusqlite::params![id, t.title, t.notes, t.category_id, t.due, t.time, t.done]).map_err(err)?;
    Ok(id.unwrap_or_else(|| conn.last_insert_rowid()).to_string())
}

pub fn set_done(conn: &Connection, id: &str, done: bool) -> Result<(), String> {
    conn.execute("UPDATE tasks SET done = ?2 WHERE id = ?1", rusqlite::params![int(id)?, done]).map_err(err)?;
    Ok(())
}

pub fn remove_task(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM tasks WHERE id = ?1", [int(id)?]).map_err(err)?;
    Ok(())
}

/// Adds a category; a name that exists in any letter case is refused with the app's own message.
pub fn add_category(conn: &Connection, name: &str, color: &str) -> Result<CategoryRow, String> {
    let same: Option<String> =
        conn.query_row("SELECT name FROM categories WHERE name = ?1", [name], |r| r.get(0)).map(Some).or_else(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => Ok(None),
            e => Err(e),
        }).map_err(err)?;
    if let Some(same) = same {
        return Err(format!("There is already a category called {same}."));
    }
    conn.execute("INSERT INTO categories (name, color) VALUES (?1, ?2)", [name, color]).map_err(err)?;
    Ok(CategoryRow { id: conn.last_insert_rowid().to_string(), name: name.into(), color: color.into() })
}

/// Loads the first snapshot (ids kept) in one transaction, only while `user_version` is 0, and sets it to 1.
/// Returns whether it imported.
pub fn import(conn: &mut Connection, tasks: &[TaskRow], categories: &[CategoryRow]) -> Result<bool, String> {
    if version(conn)? != 0 {
        return Ok(false);
    }
    let tx = conn.transaction().map_err(err)?;
    for c in categories {
        tx.execute("INSERT INTO categories (id, name, color) VALUES (?1, ?2, ?3)", rusqlite::params![int(&c.id)?, c.name, c.color]).map_err(err)?;
    }
    for t in tasks {
        tx.execute(UPSERT, rusqlite::params![int(&t.id)?, t.title, t.notes, t.category_id, t.due, t.time, t.done]).map_err(err)?;
        set_done(&tx, &t.id, t.done)?;
    }
    tx.pragma_update(None, "user_version", 1).map_err(err)?;
    tx.commit().map_err(err)?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        init(&conn).unwrap();
        conn
    }
    fn task(title: &str) -> TaskRow {
        TaskRow { id: String::new(), title: title.into(), notes: "n".into(), category_id: "1".into(), due: "2026-03-15".into(), time: "09:30".into(), done: false }
    }
    fn cat(id: &str, name: &str) -> CategoryRow {
        CategoryRow { id: id.into(), name: name.into(), color: "blue".into() }
    }

    #[test]
    fn open_in_creates_the_directory_and_file_and_refuses_no_directory() {
        let dir = std::env::temp_dir().join(format!("nshtodo-db-test-{}", std::process::id())).join("app");
        let dir = dir.to_str().unwrap();
        let conn = open_in(dir).unwrap();
        save_task(&conn, &task("kept")).unwrap();
        drop(conn);
        assert_eq!(tasks(&open_in(dir).unwrap()).unwrap().len(), 1);
        std::fs::remove_dir_all(std::path::Path::new(dir).parent().unwrap()).unwrap();
        assert_eq!(open_in("").unwrap_err(), "this platform keeps no data directory");
    }

    #[test]
    fn a_new_database_is_empty_at_version_0_and_init_is_repeatable() {
        let conn = db();
        init(&conn).unwrap();
        assert_eq!(version(&conn).unwrap(), 0);
        assert!(tasks(&conn).unwrap().is_empty());
        assert!(categories(&conn).unwrap().is_empty());
    }

    #[test]
    fn a_task_is_inserted_with_a_new_id_and_updated_by_id_keeping_done() {
        let conn = db();
        let id = save_task(&conn, &task("Buy milk")).unwrap();
        assert_eq!(id, "1");
        assert_eq!(save_task(&conn, &task("Pay rent")).unwrap(), "2");
        set_done(&conn, &id, true).unwrap();
        let edited = TaskRow { id: id.clone(), title: "Buy oat milk".into(), notes: String::new(), category_id: String::new(), due: String::new(), time: String::new(), done: false };
        assert_eq!(save_task(&conn, &edited).unwrap(), id);
        let all = tasks(&conn).unwrap();
        assert_eq!(all.len(), 2);
        assert_eq!(all[0], TaskRow { done: true, ..edited });
    }

    #[test]
    fn done_toggles_and_a_task_is_removed() {
        let conn = db();
        let id = save_task(&conn, &task("A")).unwrap();
        set_done(&conn, &id, true).unwrap();
        assert!(tasks(&conn).unwrap()[0].done);
        set_done(&conn, &id, false).unwrap();
        assert!(!tasks(&conn).unwrap()[0].done);
        remove_task(&conn, &id).unwrap();
        assert!(tasks(&conn).unwrap().is_empty());
    }

    #[test]
    fn a_category_gets_an_id_and_a_duplicate_name_is_refused_ignoring_case() {
        let conn = db();
        let work = add_category(&conn, "Work", "violet").unwrap();
        assert_eq!(work, CategoryRow { id: "1".into(), name: "Work".into(), color: "violet".into() });
        let err = add_category(&conn, "wORK", "blue").unwrap_err();
        assert_eq!(err, "There is already a category called Work.");
        assert_eq!(categories(&conn).unwrap(), vec![work]);
    }

    #[test]
    fn import_runs_once_in_one_transaction_and_keeps_ids() {
        let mut conn = db();
        let t = TaskRow { id: "7".into(), done: true, ..task("Old") };
        assert!(import(&mut conn, &[t.clone()], &[cat("3", "Home")]).unwrap());
        assert_eq!(version(&conn).unwrap(), 1);
        assert_eq!(tasks(&conn).unwrap(), vec![t]);
        assert_eq!(categories(&conn).unwrap(), vec![cat("3", "Home")]);
        assert!(!import(&mut conn, &[task("Again")], &[cat("9", "Other")]).unwrap());
        assert_eq!(tasks(&conn).unwrap().len(), 1);
        assert_eq!(save_task(&conn, &task("Next")).unwrap(), "8");
    }

    #[test]
    fn a_failed_import_leaves_nothing_and_version_0() {
        let mut conn = db();
        let dup = [cat("1", "Home"), cat("2", "HOME")];
        assert!(import(&mut conn, &[task("X")], &dup).is_err());
        assert_eq!(version(&conn).unwrap(), 0);
        assert!(tasks(&conn).unwrap().is_empty());
        assert!(categories(&conn).unwrap().is_empty());
    }
}
