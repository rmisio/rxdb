/**
 * this is a template for a test.
 * If you found a bug, edit this test to reproduce it
 * and than make a pull-request with that failing test.
 * The maintainer will later move your test to the correct possition in the test-suite.
 *
 * To run this test do:
 * - 'npm run test:node' so it runs in nodejs
 * - 'npm run test:browser' so it runs in the browser
 */
// import assert from 'assert';
// import AsyncTestUtil from 'async-test-util';

import assert from 'assert';
import RxDB from '../../dist/lib/index';
import * as util from '../../dist/lib/util';

const collections = [
    {
        name: 'heroes',
        schema: {
            title: 'hero schema',
            description: 'describes a simple hero',
            version: 0,
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    primary: true
                },
                'color': {
                    type: 'string',
                    encrypted: true,
                },
                'unencryptedColor': {
                    type: 'string',
                },
            },
            required: ['color', 'unencryptedColor']
        }
    }
];

describe('find-encrypted-field.test.js', () => {
    it('should allow querying via an encrypted field with an unencrypted value', async () => {
        RxDB.QueryChangeDetector.enableDebugging();
        RxDB.plugin(require('pouchdb-adapter-idb'));
        RxDB.plugin(require('pouchdb-adapter-http'));

        // generate a random database-name
        const name = util.randomCouchString(10);
        let db;

        const connectDb = async () => {
            // create a database
            db = await RxDB.create({
                name,
                adapter: 'idb',
                password: 'myLongAndStupidPassword'
            });

            await Promise.all(
                collections.map(
                    async colData => {
                        await db.collection(
                            JSON.parse(JSON.stringify(colData))
                        );
                    }
                )
            );

            // insert a document
            await db.collections.heroes.insert({
                name: 'chuck',
                color: 'orange',
                unencryptedColor: 'blue'
            });

            return db;
        };

        await connectDb();

        const allRecords = await db.collections.heroes
            .find()
            .exec();

        console.dir(allRecords.map(r => r.toJSON()));

        const blueRecords = allRecords
            .map(record => record.toJSON())
            .filter(record => record.unencryptedColor === 'blue');

        // A record with the color 'blue' exists in the DB
        assert.equal(blueRecords.length, 1);

        // If I query for a record with the color 'blue', I find it.
        const blueRecordsViaColorSelector = await db.collections.heroes
            .find({ unencryptedColor: { $eq: 'blue' } })
            .exec();
        assert.equal(blueRecordsViaColorSelector.length, 1);

        const orangeRecords = allRecords
            .map(record => record.toJSON())
            .filter(record => record.color === 'orange');

        // A record with the color 'orange' exists in the DB
        assert.equal(orangeRecords.length, 1);

        // If I query for a record with the color 'orange', I find it.
        const orangeRecordsViaColorSelector = await db.collections.heroes
            .find({ color: { $eq: 'orange' } })
            .exec();
        assert.equal(orangeRecordsViaColorSelector.length, 1);
    });
});
