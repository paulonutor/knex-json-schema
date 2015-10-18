import Promise from "bluebird";
import tape from "tape";
import sinon from "sinon";
import TableBuilder from "knex/lib/schema/tablebuilder";

import JsonSchemaBuilder from "../src/builder";

let builder, knex;

function createTableBuilderMock() {
	return sinon.createStubInstance(TableBuilder);
}

function createKnexMock() {
	return {
		schema: {
			hasTable: sinon.stub(),
			createTable: sinon.stub().returns(Promise.resolve(createTableBuilderMock())),
			table: sinon.stub().returns(Promise.resolve(createTableBuilderMock()))
		}
	};
}

function test(name, fn) {
	tape(name, t => {
		builder = new JsonSchemaBuilder(createKnexMock());
		knex = builder.knex;
		fn(t)
	});
}

test("normalize empty schema", t => {
	let normalizedSchema = builder.normalizeSchema({});

	t.deepEqual(normalizedSchema, {
		required: [],
		properties: {}
	}, "should contain empty required-array and properties-object");
	t.end();
});

test("add missing required-array to schema", t => {
	let normalizedSchema = builder.normalizeSchema({ properties: { foo: "bar" } });

	t.deepEqual(normalizedSchema, {
		required: [],
		properties: { foo: "bar" }
	}, "should contain empty required-array");
	t.end();
});

test("add missing properties-object to schema", t => {
	let normalizedSchema = builder.normalizeSchema({ required: ["id"] });

	t.deepEqual(normalizedSchema, {
		required: ["id"],
		properties: {}
	}, "should contain empty properties-object");
	t.end();
});

test("normalize schema on sync", t => {
	sinon.spy(builder, "normalizeSchema");
	knex.schema.hasTable.returns(Promise.resolve(false));

	let rawSchema = { foo: "bar" };
	builder.sync(rawSchema);

	t.ok(builder.normalizeSchema.calledWith(rawSchema),
		 "should call \"normalizeSchema\" with raw schema");
	t.end();
});

test("create table if table does not exist", t => {
	sinon.spy(builder, "createTable");
	knex.schema.hasTable.returns(Promise.resolve(false));

	builder.sync({ name: "foo-table" }).then(() => {
		t.ok(builder.createTable.called,
			"should have called \"createTable\"");
		t.end();
	});
});

test("update table if table exists", t => {
	sinon.spy(builder, "updateTable");
	knex.schema.hasTable.returns(Promise.resolve(true));

	builder.sync({ name: "foo-table" }).then(() => {
		t.ok(builder.updateTable.called,
			"should have called \"updateTable\"");
		t.end();
	});
});


