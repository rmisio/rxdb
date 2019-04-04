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

import RxDB from '../../dist/lib/index';
import * as util from '../../dist/lib/util';

const collections = [
    {
        name: 'heroes',
        schema: {
            'title': 'hero schema',
            'description': 'describes a simple hero',
            'version': 0,
            'type': 'object',
            'properties': {
                'name': {
                    'type': 'string',
                    'primary': true
                },
                'color': {
                    'type': 'string',
                    encrypted: true
                },
                'happy': {
                    'type': 'boolean',
                    encrypted: true,
                    // default: true
                }
            },
            'required': ['color']
        },
    }
];

describe('encrypt-bug-917.test.js', () => {
    it('should fail because it reproduces the bug', async () => {
        RxDB.QueryChangeDetector.enableDebugging();
        RxDB.plugin(require('pouchdb-adapter-idb'));
        RxDB.plugin(require('pouchdb-adapter-http'));

        // generate a random database-name
        const dbName = util.randomCouchString(10);
        let db;

        const connectDb = async () => {
            // create a database
            db = await RxDB.create({
                name: dbName,
                adapter: 'idb',
                password: 'myLongAndStupidPassword'
            });

            await Promise.all(
                collections.map(
                    colData => db.collection(
                        JSON.parse(JSON.stringify(colData))
                    )
                )
            );

            // insert a document
            const record = await db.heroes.findOne().exec();

            if (!record) {
                await db.heroes.upsert({
                    name: 'big-billy',
                    color: 'arugula',
                });
            }

        };

        await connectDb();

        // will throw exception:
        await db.heroes.findOne().exec();

        // clean up afterwards
        db.destroy();
    });
});
