import Promise from "bluebird";

const dateFormats = ["date-time", "date", "time"];
const numberTypes = ["integer", "number"];

export default class JsonSchemaBuilder {
	constructor(knex) {
		this.knex = knex;
	}

	sync(rawSchema) {
		let schema = this.normalizeSchema(rawSchema);

		return this.knex.schema.hasTable(schema.name).then(exists => {
			if (exists) {
				return this.updateTable(schema);
			}
			return this.createTable(schema);
		});
	}

	createTable(schema) {
		return this.knex.schema.createTable(schema.name).then(table => {
			this.applyDefaultTableSettings(table);

			// every table has an incrementing id-column
			table.increments("id");

			// always create timestamp columns (created_at, updated_at)
			table.timestamps();

			var columns = Object.entries(schema.properties).map(() => {
				if (definition.type == "array") {
					return this.createArrayColumn(schema.name, name, definition);
				}

				let column = this.createColumn(table, name, definition);

				// set column as required
				if (column && schema.required.includes(name)) {
					column.notNullable();
				}

				return Promise.resolve(column);
			});

			return Promise.all(columns);
		});
	}

	updateTable(schema) {
		return this.knex.schema.table(schema.name).then(table => {

		});
	}

	createArrayColumn(parentTableName, name, definition) {
		let tableName = `${parentTableName}__${name}`;

		return this.knex.schema.createTable(tableName).then(table => {
			this.applyDefaultTableSettings(table);

			table.integer("id").notNullable();

			table.integer("parent_id")
				.notNullable()
				.references("id")
				.inTable(parentTableName)
				.onDelete("CASCADE");

			// define compound key
			table.primary(["id", "parent_id"]);

			let valueColumn = this.createColumn(table, "value", definition.items);
			valueColumn.notNullable();

			if (definition.uniqueItems) {
				valueColumn.unique();
			}
		});
	}

	createColumn(table, name, definition) {
		let column;

		if (definition.type == "string") {
			switch (definition.format) {
				case "date-time":
					column = table.dateTime(name);
					break;
				case "date":
					column = table.date(name);
					break;
				case "time":
					column = table.time(name);
					break;
				case "memo":
					column = table.text(name, "longtext");
					break;
				default:
					column = table.text(name);
			}
		} else if (definition.type == "boolean") {
			column = table.boolean(name);
		} else if (definition.type == "integer") {
			column = table.integer();
		} else if (definition.type == "number") {
			if (definition.precision > 0 && definition.scale >= 0) {
				column = table.decimal(name, definition.precision, definition.scale);
			} else {
				column = table.float(name);
			}
		}

		return column;
	}

	normalizeSchema(rawSchema) {
		return Object.assign({ required: [], properties: {} }, rawSchema);
	}

	applyDefaultTableSettings(table) {
		// MySql/MariaDB specific settings
		table.engine("InnoDB");
		table.charset("utf8");
		table.collate("utf8_unicode_ci");
	}
}
