const connectDatabase = require("./database");
const readline = require("readline");
const {
    addTodo,
    getTodos,
    getTodo,
    toggleTodo,
    renameTodo,
    deleteTodo,
    deleteAllTodos,
    getCompletedTodos,
    getIncompleteTodos,
    deleteCompletedTodos,
    deleteIncompleteTodos
} = require("./todo");

function showHelp() {
    console.log(`
Todo CLI

Commands:

  add "title"
      Add a new todo

  list
      List all todos

  list --completed
      List completed todos

  list --incomplete
      List incomplete todos

  done <number>
      Toggle a todo between completed and incomplete

  edit <number> "new title"
      Rename a todo

  rm <number>
      Delete one todo

  clear --completed
      Delete all completed todos

  clear --incomplete
      Delete all incomplete todos

  clear --all
      Delete all todos
`);
}

function parseTodoNumber(value) {
    const todoNumber = Number(value);

    if (!Number.isInteger(todoNumber) || todoNumber < 1) {
        throw new Error("Todo number must be a positive integer");
    }

    return todoNumber;
}

function printTodos(todos) {
    if (todos.length === 0) {
        console.log("No todos found.");
        return;
    }

    console.log("\nID   Status       Title");
    console.log("----------------------------------------");

    for (const todo of todos) {
        const status = todo.completed ? "completed" : "incomplete";

        console.log(
            `${String(todo.todoNumber).padEnd(4)} ${status.padEnd(12)} ${todo.title}`
        );
    }

    console.log();
}

function askConfirmation(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(`${question} (y/N): `, (answer) => {
            rl.close();

            resolve(answer.trim().toLowerCase() === "y");
        });
    });
}

async function main() {
    const command = process.argv[2];

    await connectDatabase();
    if (!command) {
        showHelp();
        return;
    }

    switch (command) {
        case "add": {
            const title = process.argv[3];

            if (!title) {
                throw new Error("Todo title is required");
            }

            const todoNumber = await addTodo(title);

            console.log(`Created todo: ${todoNumber}`);
            break;
        }

        case "list": {
            const option = process.argv[3];

            if (option === "--completed") {
                const todos = await getCompletedTodos();
                printTodos(todos);
                break;
            }

            if (option === "--incomplete") {
                const todos = await getIncompleteTodos();
                printTodos(todos);
                break;
            }

            if (option) {
                throw new Error("Unknown list option");
            }

            const todos = await getTodos();
            printTodos(todos);
            break;
        }

        case "done": {
            const todoNumber = parseTodoNumber(process.argv[3]);

            const changed = await toggleTodo(todoNumber);

            if (!changed) {
                throw new Error(`Todo ${todoNumber} not found`);
            }

            console.log(`Todo ${todoNumber} updated`);
            break;
        }

        case "edit": {
            const todoNumber = parseTodoNumber(process.argv[3]);
            const title = process.argv[4];

            if (!title) {
                throw new Error("New todo title is required");
            }

            const changed = await renameTodo(todoNumber, title);

            if (!changed) {
                throw new Error(`Todo ${todoNumber} not found`);
            }

            console.log(`Todo ${todoNumber} renamed`);
            break;
        }

        case "rm": {
            const todoNumber = parseTodoNumber(process.argv[3]);

            const todo = await getTodo(todoNumber);

            if (!todo) {
                throw new Error(`Todo ${todoNumber} not found`);
            }

            const confirmed = await askConfirmation(
                `Delete todo ${todoNumber} "${todo.title}"?`
            );

            if (!confirmed) {
                console.log("Deletion cancelled");
                break;
            }

            const deleted = await deleteTodo(todoNumber);

            if (!deleted) {
                throw new Error(`Todo ${todoNumber} could not be deleted`);
            }

            console.log(`Deleted todo ${todoNumber}`);
            break;
        }

        case "clear": {
            const option = process.argv[3];

            let count = 0;

            if (option === "--completed") {
                const confirmed = await askConfirmation(
                    "Delete all completed todos?"
                );

                if (!confirmed) {
                    console.log("Clear cancelled");
                    break;
                }

                count = await deleteCompletedTodos();

                console.log(`Deleted ${count} completed todos`);
                break;
            }

            if (option === "--incomplete") {
                const confirmed = await askConfirmation(
                    "Delete all incomplete todos?"
                );

                if (!confirmed) {
                    console.log("Clear cancelled");
                    break;
                }

                count = await deleteIncompleteTodos();

                console.log(`Deleted ${count} incomplete todos`);
                break;
            }

            if (option === "--all") {
                const confirmed = await askConfirmation(
                    "Delete ALL todos?"
                );

                if (!confirmed) {
                    console.log("Clear cancelled");
                    break;
                }

                count = await deleteAllTodos();

                console.log(`Deleted ${count} todos`);
                break;
            }

            throw new Error(
                "Clear requires --completed, --incomplete, or --all"
            );
        }

        default:
            throw new Error(`Unknown command: ${command}`);
    }
}

main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
});